import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.inspection import permutation_importance

try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False
    print("Warning: xgboost package is not available. Will fallback to other models.")

def run_training():
    print("--- Starting Model Training ---")

    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_path = os.path.join(BASE_DIR, "data", "processed", "train_features.csv")
    test_path = os.path.join(BASE_DIR, "data", "processed", "test_features.csv")
    models_dir = os.path.join(BASE_DIR, "models")
    reports_dir = os.path.join(BASE_DIR, "reports")
    os.makedirs(models_dir, exist_ok=True)
    os.makedirs(reports_dir, exist_ok=True)

    # Load processed datasets
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)

    features = [
        "rainfall_1d",
        "rainfall_3d",
        "rainfall_7d",
        "rainfall_14d",
        "rainfall_change_1d",
        "rainfall_change_3d",
        "rainfall_rate_3d",
        "rainfall_deviation",
        "temperature",
        "humidity",
        "pressure",
        "wind_speed",
        "month",
        "season",
        "latitude",
        "longitude"
    ]

    X_train = train_df[features]
    y_train = train_df['is_flood']
    X_test = test_df[features]
    y_test = test_df['is_flood']

    # Class Imbalance Check & Print
    train_pos = int(sum(y_train == 1))
    train_neg = int(sum(y_train == 0))
    scale_pos_weight = train_neg / max(1, train_pos)

    print(f"Training positive (flood): {train_pos}")
    print(f"Training negative (no-flood): {train_neg}")
    print(f"scale_pos_weight: {scale_pos_weight:.4f}")

    # Compute sample weights for Gradient Boosting (which doesn't have class_weight parameter)
    sample_weights_train = np.where(y_train == 1, scale_pos_weight, 1.0)

    # Save standard scaler (preprocessor) fitted only on training data (Section 17 & Section 43)
    scaler = StandardScaler()
    scaler.fit(X_train)
    preprocessor_path = os.path.join(models_dir, "preprocessor.joblib")
    joblib.dump(scaler, preprocessor_path)
    print(f"Saved preprocessor (StandardScaler) to {preprocessor_path}")

    # 5 Models setup
    classifiers = {
        "Logistic Regression": LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42),
        "Decision Tree": DecisionTreeClassifier(class_weight="balanced", random_state=42),
        "Random Forest": RandomForestClassifier(class_weight="balanced", n_estimators=100, random_state=42),
        "Gradient Boosting": GradientBoostingClassifier(random_state=42)
    }

    if XGB_AVAILABLE:
        classifiers["XGBoost"] = XGBClassifier(
            scale_pos_weight=scale_pos_weight,
            eval_metric="logloss",
            random_state=42
        )

    results = []
    pipelines = {}

    for name, clf in classifiers.items():
        print(f"\nTraining model: {name}...")

        # Consistent pipeline containing StandardScaler + Classifier
        pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', clf)
        ])

        # Fit model
        if name == "Gradient Boosting":
            pipeline.fit(X_train, y_train, classifier__sample_weight=sample_weights_train)
        else:
            pipeline.fit(X_train, y_train)

        # Predict on chronological test set
        preds = pipeline.predict(X_test)
        probs = pipeline.predict_proba(X_test)[:, 1]

        # Evaluate
        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds)
        f1 = f1_score(y_test, preds, zero_division=0)
        auc = roc_auc_score(y_test, probs)

        print(f"  Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")

        results.append({
            "Model": name,
            "Accuracy": acc,
            "Precision": prec,
            "Recall": rec,
            "F1-Score": f1,
            "ROC-AUC": auc
        })
        pipelines[name] = pipeline

    # Save comparison CSV
    results_df = pd.DataFrame(results)
    comparison_path = os.path.join(models_dir, "model_comparison.csv")
    results_df.to_csv(comparison_path, index=False)
    print(f"\nSaved model comparisons to {comparison_path}")

    # Model Selection Rule (Section 20)
    # Primary: Recall, Secondary: F1-Score, Tertiary: ROC-AUC
    # We score models using: Recall * 0.5 + F1-Score * 0.3 + ROC-AUC * 0.2
    results_df['selection_score'] = (results_df['Recall'] * 0.5) + (results_df['F1-Score'] * 0.3) + (results_df['ROC-AUC'] * 0.2)
    best_row = results_df.sort_values(by="selection_score", ascending=False).iloc[0]
    best_model_name = best_row["Model"]
    best_pipeline = pipelines[best_model_name]

    print(f"\nBEST MODEL SELECTED: {best_model_name}")
    print(f"  Recall (Safety): {best_row['Recall']:.4f}")
    print(f"  F1-Score: {best_row['F1-Score']:.4f}")
    print(f"  ROC-AUC: {best_row['ROC-AUC']:.4f}")

    # Save winning pipeline
    best_model_path = os.path.join(models_dir, "best_model.joblib")
    joblib.dump(best_pipeline, best_model_path)
    print(f"Saved best model pipeline to {best_model_path}")

    # Model Metadata (Section 20 & Section 43)
    metadata = {
        "selected_model": best_model_name,
        "features": features,
        "training_period": "2010-01-01 to 2020-12-31",
        "testing_period": "2021-01-01 to 2023-12-31",
        "metrics": {
            "accuracy": float(best_row['Accuracy']),
            "precision": float(best_row['Precision']),
            "recall": float(best_row['Recall']),
            "f1": float(best_row['F1-Score']),
            "roc_auc": float(best_row['ROC-AUC'])
        },
        "dataset_version": "v3.0",
        "weather_source": "ECMWF ERA5 via Open-Meteo",
        "flood_source": "IIT Delhi/IMD IFI-Impacts v3.0",
        "alert_threshold": 0.40,  # Default validated alert threshold
        "training_timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

    metadata_path = os.path.join(models_dir, "model_metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=4)
    print(f"Saved model metadata to {metadata_path}")

    # Feature Importance (Section 18 & Section 43)
    print("\nCalculating Feature Importances...")
    best_classifier = best_pipeline.named_steps['classifier']

    feature_importances = []
    if hasattr(best_classifier, "feature_importances_"):
        importances = best_classifier.feature_importances_
        for feat, imp in zip(features, importances):
            feature_importances.append({"Feature": feat, "Importance": imp})
    elif hasattr(best_classifier, "coef_"):
        importances = np.abs(best_classifier.coef_[0])
        importances = importances / np.sum(importances) # Normalize
        for feat, imp in zip(features, importances):
            feature_importances.append({"Feature": feat, "Importance": imp})
    else:
        print("Model does not support native importances, running permutation importance...")
        r = permutation_importance(best_pipeline, X_test, y_test, n_repeats=5, random_state=42)
        importances = r.importances_mean
        importances = np.abs(importances) / np.sum(np.abs(importances))
        for feat, imp in zip(features, importances):
            feature_importances.append({"Feature": feat, "Importance": imp})

    fi_df = pd.DataFrame(feature_importances).sort_values(by="Importance", ascending=False)
    fi_path = os.path.join(models_dir, "feature_importance.csv")
    fi_df.to_csv(fi_path, index=False)
    print(f"Saved feature importances to {fi_path}")

    # --------------------------------------------------
    # ABLATION EXPERIMENTS (Section 18)
    # --------------------------------------------------
    print("\nRunning Feature Ablation Experiments...")
    ablation_sets = {
        "A. Rainfall Only": [
            "rainfall_1d", "rainfall_3d", "rainfall_7d", "rainfall_14d",
            "rainfall_change_1d", "rainfall_change_3d", "rainfall_rate_3d", "rainfall_deviation"
        ],
        "B. Rainfall + Weather": [
            "rainfall_1d", "rainfall_3d", "rainfall_7d", "rainfall_14d",
            "rainfall_change_1d", "rainfall_change_3d", "rainfall_rate_3d", "rainfall_deviation",
            "temperature", "humidity", "pressure", "wind_speed"
        ],
        "C. Rainfall + Weather + Seasonal (Full)": features
    }

    ablation_results = []

    for ab_name, ab_feats in ablation_sets.items():
        print(f"  Training Gradient Boosting on: {ab_name}")

        ab_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', GradientBoostingClassifier(random_state=42))
        ])

        ab_pipeline.fit(train_df[ab_feats], y_train, classifier__sample_weight=sample_weights_train)
        ab_preds = ab_pipeline.predict(test_df[ab_feats])
        ab_probs = ab_pipeline.predict_proba(test_df[ab_feats])[:, 1]

        ab_acc = accuracy_score(y_test, ab_preds)
        ab_prec = precision_score(y_test, ab_preds, zero_division=0)
        ab_rec = recall_score(y_test, ab_preds)
        ab_f1 = f1_score(y_test, ab_preds, zero_division=0)
        ab_auc = roc_auc_score(y_test, ab_probs)

        ablation_results.append({
            "Feature Set": ab_name,
            "Accuracy": ab_acc,
            "Precision": ab_prec,
            "Recall": ab_rec,
            "F1-Score": ab_f1,
            "ROC-AUC": ab_auc
        })

    ablation_df = pd.DataFrame(ablation_results)
    ablation_csv_path = os.path.join(reports_dir, "feature_ablation.csv")
    ablation_df.to_csv(ablation_csv_path, index=False)
    print(f"Saved feature ablation comparison to {ablation_csv_path}")
    print(ablation_df.to_string(index=False))

    # --------------------------------------------------
    # CHENNAI-SPECIFIC MODEL (Section 17)
    # --------------------------------------------------
    print("\nEvaluating Chennai-Specific standalone model feasibility...")
    train_chennai = train_df[train_df['district'] == 'chennai']
    test_chennai = test_df[test_df['district'] == 'chennai']

    ch_pos_train = sum(train_chennai['is_flood'] == 1)
    ch_pos_test = sum(test_chennai['is_flood'] == 1)

    print(f"  Chennai train positive samples: {ch_pos_train}")
    print(f"  Chennai test positive samples: {ch_pos_test}")

    if ch_pos_train >= 10 and ch_pos_test >= 2:
        print("  Sufficient data exists. Training Chennai-Specific standalone model...")
        ch_scale_weight = sum(train_chennai['is_flood'] == 0) / ch_pos_train
        ch_sample_weights = np.where(train_chennai['is_flood'] == 1, ch_scale_weight, 1.0)

        ch_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', GradientBoostingClassifier(random_state=42))
        ])

        ch_pipeline.fit(train_chennai[features], train_chennai['is_flood'], classifier__sample_weight=ch_sample_weights)

        # Evaluate Chennai model on Chennai test set
        ch_preds = ch_pipeline.predict(test_chennai[features])
        ch_probs = ch_pipeline.predict_proba(test_chennai[features])[:, 1]

        ch_acc = accuracy_score(test_chennai['is_flood'], ch_preds)
        ch_prec = precision_score(test_chennai['is_flood'], ch_preds, zero_division=0)
        ch_rec = recall_score(test_chennai['is_flood'], ch_preds)
        ch_f1 = f1_score(test_chennai['is_flood'], ch_preds, zero_division=0)
        ch_auc = roc_auc_score(test_chennai['is_flood'], ch_probs)

        # Save Chennai model
        ch_model_path = os.path.join(models_dir, "chennai_model.joblib")
        joblib.dump(ch_pipeline, ch_model_path)
        print(f"  Saved Chennai standalone model to {ch_model_path}")

        # Evaluate Tamil Nadu-wide best model on Chennai test set for comparison
        tn_preds_on_ch = best_pipeline.predict(test_chennai[features])
        tn_probs_on_ch = best_pipeline.predict_proba(test_chennai[features])[:, 1]

        tn_acc = accuracy_score(test_chennai['is_flood'], tn_preds_on_ch)
        tn_prec = precision_score(test_chennai['is_flood'], tn_preds_on_ch, zero_division=0)
        tn_rec = recall_score(test_chennai['is_flood'], tn_preds_on_ch)
        tn_f1 = f1_score(test_chennai['is_flood'], tn_preds_on_ch, zero_division=0)
        tn_auc = roc_auc_score(test_chennai['is_flood'], tn_probs_on_ch)

        comparison_results = [
            {
                "Model Scope": "Tamil Nadu-wide model evaluated on Chennai",
                "Accuracy": tn_acc,
                "Precision": tn_prec,
                "Recall": tn_rec,
                "F1-Score": tn_f1,
                "ROC-AUC": tn_auc
            },
            {
                "Model Scope": "Chennai-specific model evaluated on Chennai",
                "Accuracy": ch_acc,
                "Precision": ch_prec,
                "Recall": ch_rec,
                "F1-Score": ch_f1,
                "ROC-AUC": ch_auc
            }
        ]

        comp_df = pd.DataFrame(comparison_results)
        comp_csv_path = os.path.join(reports_dir, "chennai_model_comparison.csv")
        comp_df.to_csv(comp_csv_path, index=False)
        print(f"  Saved Chennai model comparison to {comp_csv_path}")
        print(comp_df.to_string(index=False))
    else:
        print("  Chennai-specific training data was insufficient for a reliable standalone model.")

if __name__ == "__main__":
    run_training()
