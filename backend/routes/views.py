from rest_framework.views import APIView
from rest_framework.response import Response
import osmnx as ox
import pandas as pd
import pickle
from datetime import datetime

class RouteView(APIView):
    def post(self, request):
        try:
            source = tuple(map(float, request.data['source'].split(',')))
            dest = tuple(map(float, request.data['destination'].split(',')))
            date_time = datetime.fromisoformat(request.data['date_time'].replace('Z', '+05:30'))
        except (KeyError, ValueError) as e:
            return Response({"error": "Invalid input data"}, status=400)

        ox.settings.use_cache = True
        G = ox.graph_from_place('Indore, India', network_type='drive')
        edges = ox.graph_to_gdfs(G, nodes=False, edges=True)

        try:
            with open('traffic_model/traffic_model.pkl', 'rb') as f:
                model = pickle.load(f)
            with open('traffic_model/road_id_encoder.pkl', 'rb') as f:
                le = pickle.load(f)
        except FileNotFoundError:
            return Response({"error": "Model files not found"}, status=500)

        origin = ox.nearest_nodes(G, source[1], source[0])
        destination = ox.nearest_nodes(G, dest[1], dest[0])
        route = ox.shortest_path(G, origin, destination, weight='length')

        if route is None:
            return Response({"error": "No route found"}, status=404)

        results = []
        for u, v in zip(route[:-1], route[1:]):
            edge_data = G.get_edge_data(u, v, 0)
            if not edge_data:
                continue
            osm_id = edge_data.get('osmid', 0)
            if isinstance(osm_id, list):
                osm_id = osm_id[0]

            try:
                road_id_encoded = le.transform([osm_id])[0] if osm_id in le.classes_ else le.transform([le.classes_[0]])[0]
            except ValueError:
                road_id_encoded = le.transform([le.classes_[0]])[0]

            features = pd.DataFrame({
                'road_id_encoded': [road_id_encoded],
                'hour': [date_time.hour],
                'day_of_week': [date_time.weekday()]
            })
            speed = model.predict(features)[0]
            congestion = 'red' if speed < 30 else 'yellow' if speed < 60 else 'green'

            # Access geometry via edge index
            try:
                edge = edges.loc[(u, v, 0)]
                coords = edge['geometry'].coords
            except KeyError:
                continue

            results.append({
                'road_id': osm_id,
                'latitude_start': coords[0][1],
                'longitude_start': coords[0][0],
                'latitude_end': coords[-1][1],
                'longitude_end': coords[-1][0],
                'speed_kmh': round(speed, 1),
                'congestion_level': congestion
            })

        return Response(results)