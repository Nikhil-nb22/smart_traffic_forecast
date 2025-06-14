from django.core.management.base import BaseCommand
import osmnx as ox
from datetime import datetime, timedelta
import random
from routes.models import TrafficData

class Command(BaseCommand):
    help = 'Seeds dummy traffic data for Indore'

    def handle(self, *args, **kwargs):
        ox.settings.use_cache = False
        G = ox.graph_from_place('Indore, India', network_type='drive')
        edges = ox.graph_to_gdfs(G, nodes=False, edges=True)

        num_segments = 100
        time_slots = ['08:00:00', '14:00:00', '18:00:00']
        start_date = datetime(2025, 5, 1)
        num_days = 33

        count = 0
        for idx, row in edges.head(num_segments).iterrows():
            osm_id = row['osmid']
            if isinstance(osm_id, list):
                osm_id = osm_id[0]  # Take first ID
            if not isinstance(osm_id, (int, float)):
                continue  # Skip invalid IDs
            for day in range(num_days):
                date = start_date + timedelta(days=day)
                for time in time_slots:
                    speed = random.uniform(20, 50) if time in ['08:00:00', '18:00:00'] else random.uniform(40, 80)
                    congestion = 'red' if speed < 30 else 'yellow' if speed < 60 else 'green'
                    TrafficData.objects.create(
                        road_id=int(osm_id),
                        latitude_start=row.geometry.coords[0][1],
                        longitude_start=row.geometry.coords[0][0],
                        latitude_end=row.geometry.coords[-1][1],
                        longitude_end=row.geometry.coords[-1][0],
                        date=date,
                        time=time,
                        speed_kmh=round(speed, 1),
                        congestion_level=congestion
                    )
                    count += 1
        self.stdout.write(self.style.SUCCESS(f'Seeded {count} records'))