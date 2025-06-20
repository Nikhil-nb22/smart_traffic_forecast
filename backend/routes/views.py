from rest_framework.views import APIView
from rest_framework.response import Response
import osmnx as ox
import pandas as pd
import pickle
from datetime import datetime
import networkx as nx

class RouteView(APIView):
    def post(self, request):
        try:
            source = tuple(map(float, request.data['source'].split(',')))
            dest = tuple(map(float, request.data['destination'].split(',')))
            date_time = datetime.fromisoformat(request.data['date_time'].replace('Z', '+05:30'))
            travel_mode = request.data.get('travel_mode', 'drive')
        except (KeyError, ValueError) as e:
            return Response({"error": "Invalid input data"}, status=400)

        # Map travel mode to osmnx network type
        network_types = {'drive': 'drive', 'bike': 'bike', 'walk': 'walk'}
        network_type = network_types.get(travel_mode, 'drive')
        ox.settings.use_cache = True

        try:
            G = ox.graph_from_place('Indore, India', network_type=network_type)
            edges = ox.graph_to_gdfs(G, nodes=False, edges=True)
            # Convert multigraph to simple graph for path finding
            G_simple = nx.Graph(G)
        except Exception as e:
            return Response({"error": f"Failed to load map data: {str(e)}"}, status=500)

        try:
            with open('traffic_model/traffic_model.pkl', 'rb') as f:
                model = pickle.load(f)
            with open('traffic_model/road_id_encoder.pkl', 'rb') as f:
                le = pickle.load(f)
        except FileNotFoundError:
            return Response({"error": "Model files not found"}, status=500)

        try:
            origin = ox.nearest_nodes(G, source[1], source[0])
            destination = ox.nearest_nodes(G, dest[1], dest[0])
        except Exception as e:
            return Response({"error": f"Invalid coordinates: {str(e)}"}, status=400)

        # Generate multiple routes
        routes = []
        try:
            # Shortest path by distance using original multigraph
            route_shortest = ox.shortest_path(G, origin, destination, weight='length')
            if route_shortest:
                routes.append(('Shortest Distance', route_shortest))

            # Alternative paths using k-shortest paths on simple graph
            def get_k_shortest_paths(G, source, target, k):
                paths = []
                try:
                    for path in nx.shortest_simple_paths(G, source, target, weight='length'):
                        if len(paths) >= k:
                            break
                        if path not in paths:
                            paths.append(path)
                except nx.NetworkXNoPath:
                    pass
                return paths

            alternative_paths = get_k_shortest_paths(G_simple, origin, destination, k=3)
            for i, path in enumerate(alternative_paths):
                if path not in [p for _, p in routes]:
                    routes.append((f'Alternative Route {i+1}', path))

        except nx.NetworkXNoPath:
            return Response({"error": "No route found"}, status=404)

        if not routes:
            return Response({"error": "No routes found"}, status=404)

        # Adjust speed based on travel mode
        speed_multipliers = {'drive': 1.0, 'bike': 0.5, 'walk': 0.1}
        speed_multiplier = speed_multipliers.get(travel_mode, 1.0)

        # Process routes
        route_results = []
        for route_name, route in routes[:3]:  # Limit to 3 routes
            total_distance = 0
            total_time = 0
            segments = []
            for u, v in zip(route[:-1], route[1:]):
                # Find edge in original multigraph
                edge_data = None
                if G.has_edge(u, v):
                    edge_data = G.get_edge_data(u, v, 0)  # Default to first edge
                if not edge_data:
                    continue
                osm_id = edge_data.get('osmid', 0)
                if isinstance(osm_id, list):
                    osm_id = osm_id[0]

                # Encode road_id with fallback
                try:
                    road_id_encoded = le.transform([osm_id])[0] if osm_id in le.classes_ else le.transform([le.classes_[0]])[0]
                except ValueError:
                    road_id_encoded = le.transform([le.classes_[0]])[0]

                # Prepare features for prediction
                features = pd.DataFrame({
                    'road_id_encoded': [road_id_encoded],
                    'hour': [date_time.hour],
                    'day_of_week': [date_time.weekday()]
                })

                # Predict speed and apply travel mode adjustment
                speed = max(model.predict(features)[0] * speed_multiplier, 5)
                # Dynamic congestion thresholds based on road type
                try:
                    road_type = edge_data.get('highway', 'road')
                    max_speed = {'motorway': 80, 'primary': 60, 'secondary': 50, 'residential': 30}.get(road_type, 50)
                    congestion = 'red' if speed < max_speed * 0.4 else 'yellow' if speed < max_speed * 0.7 else 'green'
                except:
                    congestion = 'yellow'

                # Get edge geometry and length
                try:
                    edge = edges.loc[(u, v, 0)]
                    coords = edge['geometry'].coords
                    length_m = edge.get('length', 0)
                except KeyError:
                    continue

                # Calculate travel time (hours)
                segment_time = (length_m / 1000) / speed if speed > 0 else 0
                total_distance += length_m
                total_time += segment_time

                segments.append({
                    'road_id': osm_id,
                    'latitude_start': coords[0][1],
                    'longitude_start': coords[0][0],
                    'latitude_end': coords[-1][1],
                    'longitude_end': coords[-1][0],
                    'speed_kmh': round(speed, 1),
                    'congestion_level': congestion,
                    'length_m': round(length_m, 1),
                    'travel_time_min': round(segment_time * 60, 1)
                })

            route_results.append({
                'route_name': route_name,
                'total_distance_km': round(total_distance / 1000, 2),
                'total_time_min': round(total_time * 60, 1),
                'segments': segments
            })

        # Sort by travel time and mark fastest as recommended
        route_results.sort(key=lambda x: x['total_time_min'])
        if route_results:
            route_results[0]['recommended'] = True

        return Response(route_results)