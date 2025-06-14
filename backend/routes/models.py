from django.db import models

# Create your models here.


class TrafficData(models.Model):
    road_id = models.BigIntegerField()
    latitude_start = models.FloatField()
    longitude_start = models.FloatField()
    latitude_end = models.FloatField()
    longitude_end = models.FloatField()
    date = models.DateField()
    time = models.TimeField()
    speed_kmh = models.FloatField()
    congestion_level = models.CharField(max_length=20)

    class Meta:
        indexes = [
            models.Index(fields=['road_id', 'time']),
        ]

class RawGPSData(models.Model):
    latitude = models.FloatField()
    longitude = models.FloatField()
    speed_kmh = models.FloatField()
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)