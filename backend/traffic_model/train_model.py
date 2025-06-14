import os
import sys
import django

# Add backend\smart_traffic to Python path
project_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.append(project_path)

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'smart_traffic.settings')
django.setup()

import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import pickle
from routes.models import TrafficData

# Fetch data
data = TrafficData.objects.values('road_id', 'date', 'time', 'speed_kmh')
df = pd.DataFrame(data)
df['date'] = pd.to_datetime(df['date'])
df['hour'] = pd.to_datetime(df['time'], format='%H:%M:%S').dt.hour
df['day_of_week'] = df['date'].dt.dayofweek

# Encode road_id
le = LabelEncoder()
df['road_id_encoded'] = le.fit_transform(df['road_id'])

# Features and target
X = df[['road_id_encoded', 'hour', 'day_of_week']]
y = df['speed_kmh']

# Train
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X, y)

# Save
with open(os.path.join(os.path.dirname(__file__), 'traffic_model.pkl'), 'wb') as f:
    pickle.dump(model, f)
with open(os.path.join(os.path.dirname(__file__), 'road_id_encoder.pkl'), 'wb') as f:
    pickle.dump(le, f)
print("Model trained and saved.")