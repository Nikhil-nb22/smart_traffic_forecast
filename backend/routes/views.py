# E:\It Softlab Projects\smart_traffic\backend\routes\views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from django.conf import settings
import osmnx as ox
import pandas as pd
import pickle
from datetime import datetime
import networkx as nx
import os
import time

# Global graph cache
G = None
def load_graph(network_type='drive'):
    global G
    ox.settings.use_cache = True
    ox.settings.cache_folder = os.path.join(settings.BASE_DIR, 'cache')
    print("Loading graph...")
    start_time = time.time()
    G = ox.graph_from_place('Indore, India', network_type=network_type)
    print(f"Graph loaded: {time.time() - start_time:.2f}s")

# Load graph at startup
load_graph()

class RouteView(APIView):
    def post(self, request):
        start_time = time.time()
        print(f"Request start: {time.time() - start_time:.2f}s")
        try:
            source = tuple(map(float, request.data['source'].split(',')))
            dest = tuple(map(float, request.data['destination'].split(',')))
            date_time = datetime.fromisoformat(request.data['date_time'].replace('Z', '+05:30'))
            travel_mode = request.data.get('travel_mode', 'drive')
            print(f"Input parsed: {time.time() - start_time:.2f}s")
        except (KeyError, ValueError) as e:
            print(f"Error: {str(e)} at {time.time() - start_time:.2f}s")
            return Response({"error": "Invalid input data"}, status=400)

        network_types = {'drive': 'drive', 'bike': 'bike', 'walk': 'walk'}
        network_type = network_types.get(travel_mode, 'drive')
        print(f"Network type: {network_type} at {time.time() - start_time:.2f}s")

        try:
            print(f"Graph ready: {time.time() - start_time:.2f}s")
            edges = ox.graph_to_gdfs(G, nodes=False, edges=True)
            print(f"Edges conversion: {time.time() - start_time:.2f}s")
        except Exception as e:
            print(f"Error: {str(e)} at {time.time() - start_time:.2f}s")
            return Response({"error": f"Failed to load map data: {str(e)}"}, status=500)

        try:
            model_path = os.path.join(settings.BASE_DIR, 'traffic_model', 'traffic_model.pkl')
            encoder_path = os.path.join(settings.BASE_DIR, 'traffic_model', 'road_id_encoder.pkl')
            with open(model_path, 'rb') as f:
                model = pickle.load(f)
            with open(encoder_path, 'rb') as f:
                le = pickle.load(f)
            print(f"Model loaded: {time.time() - start_time:.2f}s")
        except FileNotFoundError as e:
            print(f"Error: {str(e)} at {time.time() - start_time:.2f}s")
            return Response({"error": "Model files not found"}, status=500)

        try:
            origin = ox.nearest_nodes(G, source[1], source[0])
            destination = ox.nearest_nodes(G, dest[1], dest[0])
            print(f"Nearest nodes found: {time.time() - start_time:.2f}s")
        except Exception as e:
            print(f"Error: {str(e)} at {time.time() - start_time:.2f}s")
            return Response({"error": f"Invalid coordinates: {str(e)}"}, status=400)

        routes = []
        try:
            route_shortest = ox.shortest_path(G, origin, destination, weight='length')
            if route_shortest:
                routes.append(('Shortest Distance', route_shortest))
            print(f"Shortest path computed: {time.time() - start_time:.2f}s")

            def get_k_shortest_paths(G, source, target, k):
                paths = []
                G_temp = G.copy()
                try:
                    for i in range(k):
                        try:
                            path = nx.shortest_path(G_temp, source, target, weight=lambda u, v, d: d[0].get('length', 1) * (1 + 0.1 * i))
                            edge_path = [(u, v, min(G[u][v], key=lambda k: G[u][v][k]['length'])) for u, v in zip(path[:-1], path[1:])]
                            if not any(set(edge_path) == set(existing_path) for _, existing_path in paths):
                                paths.append((f'Alternative Route {len(paths) + 1}', path))
                                for u, v, key in edge_path:
                                    G_temp.remove_edge(u, v, key)
                        except nx.NetworkXNoPath:
                            break
                except nx.NetworkXNoPath:
                    pass
                return paths

            alternative_paths = get_k_shortest_paths(G, origin, destination, k=3)
            for name, path in alternative_paths:
                if path not in [p for _, p in routes]:
                    routes.append((name, path))
            print(f"Alternative paths computed: {time.time() - start_time:.2f}s")

            for name, path in routes:
                print(f"{name}: {path}")
        except nx.NetworkXNoPath:
            print(f"Error: No route found at {time.time() - start_time:.2f}s")
            return Response({"error": "No route found"}, status=404)

        if not routes:
            print(f"Error: No routes found at {time.time() - start_time:.2f}s")
            return Response({"error": "No routes found"}, status=404)

        speed_multipliers = {'drive': 1.0, 'bike': 0.5, 'walk': 0.1}
        speed_multiplier = speed_multipliers.get(travel_mode, 1.0)
        print(f"Speed multiplier applied: {time.time() - start_time:.2f}s")

        route_results = []
        for route_name, route in routes[:3]:
            total_distance = 0
            total_time = 0
            segments = []
            for u, v in zip(route[:-1], route[1:]):
                edge_data = None
                if G.has_edge(u, v):
                    edge_data = G.get_edge_data(u, v, 0)
                if not edge_data:
                    continue
                osm_id = edge_data.get('osmid', 0)
                if isinstance(osm_id, list):
                    osm_id = osm_id[0]

                try:
                    road_id_encoded = le.transform([str(osm_id)])[0] if str(osm_id) in le.classes_ else le.transform([le.classes_[0]])[0]
                except ValueError:
                    road_id_encoded = le.transform([le.classes_[0]])[0]

                features = pd.DataFrame({
                    'road_id_encoded': [road_id_encoded],
                    'hour': [date_time.hour],
                    'day_of_week': [date_time.weekday()]
                })

                speed = max(model.predict(features)[0] * speed_multiplier, 5)
                try:
                    road_type = edge_data.get('highway', 'road')
                    max_speed = {'motorway': 80, 'primary': 60, 'secondary': 50, 'residential': 30}.get(road_type, 50)
                    congestion = 'red' if speed < max_speed * 0.4 else 'yellow' if speed < max_speed * 0.7 else 'green'
                except:
                    congestion = 'yellow'

                try:
                    edge = edges.loc[(u, v, 0)]
                    coords = edge['geometry'].coords
                    length_m = edge.get('length', 0)
                except KeyError:
                    continue

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
            print(f"Route {route_name} processed: {time.time() - start_time:.2f}s")

        route_results.sort(key=lambda x: x['total_time_min'])
        if route_results:
            route_results[0]['recommended'] = True
        print(f"Response built: {time.time() - start_time:.2f}s")

        return Response(route_results)