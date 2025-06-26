from rest_framework.views import APIView
from rest_framework.response import Response
import requests
import pandas as pd
import pickle
from datetime import datetime

class RouteView(APIView):
    def post(self, request):
        try:
            source = request.data['source']
            destination = request.data['destination']
            travel_mode = request.data.get('travel_mode', 'car')
            date_time = datetime.fromisoformat(request.data['date_time'].replace('Z', '+05:30'))
        except:
            return Response({'error': 'Invalid input format'}, status=400)

        try:
            src_lat, src_lon = map(float, source.split(','))
            dst_lat, dst_lon = map(float, destination.split(','))
        except:
            return Response({'error': 'Invalid coordinates'}, status=400)

        # OSRM URL with alternatives=true
        osrm_url = (
            f"http://localhost:5000/route/v1/{travel_mode}/"
            f"{src_lon},{src_lat};{dst_lon},{dst_lat}"
            f"?overview=full&geometries=geojson&alternatives=true"
        )

        try:
            res = requests.get(osrm_url)
            data = res.json()
            if 'routes' not in data or not data['routes']:
                return Response({'error': 'No routes found'}, status=404)
        except Exception as e:
            return Response({'error': f'OSRM error: {str(e)}'}, status=500)

        # Load ML model & encoder
        try:
            with open('traffic_model/traffic_model.pkl', 'rb') as f:
                model = pickle.load(f)
            with open('traffic_model/road_id_encoder.pkl', 'rb') as f:
                le = pickle.load(f)
        except FileNotFoundError:
            return Response({'error': 'ML model files not found'}, status=500)

        speed_multiplier = {'car': 1.0, 'bike': 0.5, 'foot': 0.1}.get(travel_mode, 1.0)

        all_routes = []
        for i, route in enumerate(data['routes']):
            coordinates = route['geometry']['coordinates']
            segments = []
            total_dist = 0
            total_time = 0

            for j in range(len(coordinates) - 1):
                lon1, lat1 = coordinates[j]
                lon2, lat2 = coordinates[j + 1]

                # Fake road_id to match with your ML encoder
                fake_road_id = f"{round(lat1, 5)}_{round(lon1, 5)}"
                try:
                    road_id_encoded = le.transform([fake_road_id])[0]
                except:
                    road_id_encoded = le.transform([le.classes_[0]])[0]

                features = pd.DataFrame({
                    'road_id_encoded': [road_id_encoded],
                    'hour': [date_time.hour],
                    'day_of_week': [date_time.weekday()]
                })

                speed = max(model.predict(features)[0] * speed_multiplier, 5)

                # Approximate distance using flat-Earth method
                dx = (lon2 - lon1) * 111.32 * 1000
                dy = (lat2 - lat1) * 110.57 * 1000
                dist = (dx**2 + dy**2) ** 0.5
                time_hr = dist / 1000 / speed

                congestion = 'red' if speed < 15 else 'yellow' if speed < 30 else 'green'

                segments.append({
                    'latitude_start': lat1,
                    'longitude_start': lon1,
                    'latitude_end': lat2,
                    'longitude_end': lon2,
                    'speed_kmh': round(speed, 1),
                    'congestion_level': congestion,
                    'length_m': round(dist, 1),
                    'travel_time_min': round(time_hr * 60, 1)
                })

                total_dist += dist
                total_time += time_hr

            all_routes.append({
                'route_name': f"Route {i + 1}",
                'total_distance_km': round(total_dist / 1000, 2),
                'total_time_min': round(total_time * 60, 1),
                'segments': segments,
                'recommended': False
            })

        # Sort and mark the best (fastest) route
        all_routes.sort(key=lambda r: r['total_time_min'])
        if all_routes:
            all_routes[0]['recommended'] = True

        return Response(all_routes)
