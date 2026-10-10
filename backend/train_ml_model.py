import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, mean_absolute_error
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
import joblib
import os

def train():
    print("Loading datasets...")
    train_df = pd.read_csv('../dataset/train.csv')
    val_df = pd.read_csv('../dataset/val.csv')

    features = [
        'kc', 'root_depth_mm', 'field_capacity', 'wilting_point', 
        'temperature_c', 'reference_et0_mm', 'soil_moisture_prev_pct', 
        'rew_prev', 'rain_forecast_24h_mm', 'water_deficit_mm'
    ]

    target_class = 'irrigation_needed'
    target_reg = 'recommended_irrigation_mm'

    X_train = train_df[features]
    y_train_class = train_df[target_class]
    y_train_reg = train_df[target_reg]

    X_val = val_df[features]
    y_val_class = val_df[target_class]
    y_val_reg = val_df[target_reg]

    print("Training Classification Model (irrigation_needed)...")
    clf = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('rf', RandomForestClassifier(n_estimators=50, max_depth=10, random_state=42))
    ])
    clf.fit(X_train, y_train_class)
    
    val_preds_class = clf.predict(X_val)
    print(f"Validation Accuracy: {accuracy_score(y_val_class, val_preds_class):.4f}")

    print("Training Regression Model (recommended_irrigation_mm)...")
    reg = Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('rf', RandomForestRegressor(n_estimators=50, max_depth=10, random_state=42))
    ])
    reg.fit(X_train, y_train_reg)

    val_preds_reg = reg.predict(X_val)
    print(f"Validation MAE: {mean_absolute_error(y_val_reg, val_preds_reg):.4f} mm")

    os.makedirs('app/core/ml', exist_ok=True)
    joblib.dump(clf, 'app/core/ml/irrigation_classifier.pkl')
    joblib.dump(reg, 'app/core/ml/irrigation_regressor.pkl')
    print("Models saved successfully to app/core/ml/")

if __name__ == "__main__":
    train()
