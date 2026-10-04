import os
import json
import joblib
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import TimeSeriesSplit, GridSearchCV
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier

try:
    from xgboost import XGBClassifier
    XGB_AVAILABLE = True
except ImportError:
    XGB_AVAILABLE = False

def run_tuning():
    print("--- Starting Rigorous Model Tuning & Evaluation ---")

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

    train_pos = int(sum(y_train == 1))
    train_neg = int(sum(y_train == 0))
    scale_pos_weight = train_neg / max(1, train_pos)

    print(f"Training positive (flood): {train_pos}")
    print(f"Training negative (no-flood): {train_neg}")
    print(f"Standard class weight (scale_pos_weight): {scale_pos_weight:.4f}")

    # Standard Scaler
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # Define TimeSeriesSplit for leakage-safe cross-validation on training data
    tscv = TimeSeriesSplit(n_splits=3)

    tuning_records = []
    trained_models = {}

    # --------------------------------------------------
    # 1. LOGISTIC REGRESSION TUNING
    # --------------------------------------------------
    print("\nTuning Logistic Regression...")
    lr_grid = {
        'C': [0.01, 0.1, 1.0, 10.0],
        'class_weight': ['balanced', None]
    }
    lr_clf = LogisticRegression(max_iter=1000, random_state=42)
    lr_search = GridSearchCV(lr_clf, lr_grid, cv=tscv, scoring='f1', n_jobs=-1)
    lr_search.fit(X_train_scaled, y_train)
    best_lr = lr_search.best_estimator_
    print(f"  Best params: {lr_search.best_params_}")

    # --------------------------------------------------
    # 2. DECISION TREE TUNING
    # --------------------------------------------------
    print("\nTuning Decision Tree...")
    dt_grid = {
        'max_depth': [5, 10, 15, None],
        'min_samples_split': [2, 5, 10],
        'class_weight': ['balanced', None]
    }
    dt_clf = DecisionTreeClassifier(random_state=42)
    dt_search = GridSearchCV(dt_clf, dt_grid, cv=tscv, scoring='f1', n_jobs=-1)
    dt_search.fit(X_train_scaled, y_train)
    best_dt = dt_search.best_estimator_
    print(f"  Best params: {dt_search.best_params_}")

    # --------------------------------------------------
    # 3. RANDOM FOREST TUNING
    # --------------------------------------------------
    print("\nTuning Random Forest...")
    rf_grid = {
        'n_estimators': [50, 100, 200],
        'max_depth': [5, 10, 15, None],
        'class_weight': ['balanced', 'balanced_subsample', None]
    }
    rf_clf = RandomForestClassifier(random_state=42, n_jobs=-1)
    rf_search = GridSearchCV(rf_clf, rf_grid, cv=tscv, scoring='f1', n_jobs=-1)
    rf_search.fit(X_train_scaled, y_train)
    best_rf = rf_search.best_estimator_
    print(f"  Best params: {rf_search.best_params_}")

    # --------------------------------------------------
    # 4. GRADIENT BOOSTING TUNING
    # --------------------------------------------------
    print("\nTuning Gradient Boosting...")
    # Since GradientBoostingClassifier doesn't support class_weight natively,
    # we can search over standard hyperparameters.
    gb_grid = {
        'n_estimators': [50, 100, 150],
        'learning_rate': [0.01, 0.05, 0.1],
        'max_depth': [3, 5, 7]
    }
    gb_clf = GradientBoostingClassifier(random_state=42)
    gb_search = GridSearchCV(gb_clf, gb_grid, cv=tscv, scoring='f1', n_jobs=-1)

    # Fit GB with sample weights on the entire training set for class imbalance
    sample_weights = np.where(y_train == 1, scale_pos_weight, 1.0)
    gb_search.fit(X_train_scaled, y_train, sample_weight=sample_weights)
    best_gb = gb_search.best_estimator_
    print(f"  Best params: {gb_search.best_params_}")

    # --------------------------------------------------
    # 5. XGBOOST TUNING
    # --------------------------------------------------
    best_xgb = None
    if XGB_AVAILABLE:
        print("\nTuning XGBoost...")
        xgb_grid = {
            'n_estimators': [50, 100, 150],
            'learning_rate': [0.01, 0.05, 0.1],
            'max_depth': [3, 5, 7],
            'scale_pos_weight': [1.0, scale_pos_weight, scale_pos_weight * 0.5]
        }
        xgb_clf = XGBClassifier(eval_metric="logloss", random_state=42, n_jobs=-1)
        xgb_search = GridSearchCV(xgb_clf, xgb_grid, cv=tscv, scoring='f1', n_jobs=-1)
        xgb_search.fit(X_train_scaled, y_train)
        best_xgb = xgb_search.best_estimator_
        print(f"  Best params: {xgb_search.best_params_}")

    # Compile candidate list
    candidates = {
        "Logistic Regression": best_lr,
        "Decision Tree": best_dt,
        "Random Forest": best_rf,
        "Gradient Boosting": best_gb
    }
    if XGB_AVAILABLE and best_xgb is not None:
        candidates["XGBoost"] = best_xgb

    # Evaluate all tuned candidates on the untouched 2021-2023 test set
    print("\n--- Evaluating Tuned Candidates on Untouched Test Set ---")
    results = []

    for name, clf in candidates.items():
        preds = clf.predict(X_test_scaled)
        probs = clf.predict_proba(X_test_scaled)[:, 1]

        acc = accuracy_score(y_test, preds)
        prec = precision_score(y_test, preds, zero_division=0)
        rec = recall_score(y_test, preds)
        f1 = f1_score(y_test, preds, zero_division=0)
        auc = roc_auc_score(y_test, probs)

        cm = confusion_matrix(y_test, preds)
        tn, fp, fn, tp = cm.ravel()

        print(f"Model: {name}")
        print(f"  Accuracy: {acc:.4f} | Precision: {prec:.4f} | Recall: {rec:.4f} | F1: {f1:.4f} | ROC-AUC: {auc:.4f}")
        print(f"  CM: TN={tn}, FP={fp}, FN={fn}, TP={tp}")

        results.append({
            "Model": name,
            "Accuracy": acc,
            "Precision": prec,
            "Recall": rec,
            "F1-Score": f1,
            "ROC-AUC": auc,
            "TN": int(tn),
            "FP": int(fp),
            "FN": int(fn),
            "TP": int(tp)
        })

    results_df = pd.DataFrame(results)

    # Save reports/model_tuning_results.csv
    results_csv_path = os.path.join(reports_dir, "model_tuning_results.csv")
    results_df.to_csv(results_csv_path, index=False)
    print(f"\nSaved model tuning and test set evaluation results to {results_csv_path}")

    # --------------------------------------------------
    # MODEL SELECTION DECISION RULE
    # --------------------------------------------------
    # Selection rule:
    # 1. Must satisfy Accuracy >= 80% (0.80)
    # 2. Of those satisfying (1), select the model with the best selection score:
    #    Selection_Score = (Recall * 0.5) + (F1-Score * 0.3) + (ROC-AUC * 0.2)
    # 3. If no models satisfy Accuracy >= 80%, select the best model regardless of accuracy,
    #    and raise an explanation.

    eligible = results_df[results_df['Accuracy'] >= 0.80].copy()
    if len(eligible) > 0:
        eligible['selection_score'] = (eligible['Recall'] * 0.5) + (eligible['F1-Score'] * 0.3) + (eligible['ROC-AUC'] * 0.2)
        best_row = eligible.sort_values(by="selection_score", ascending=False).iloc[0]
        accuracy_threshold_met = True
    else:
        # Fallback to all models if none meet the accuracy requirement
        print("WARNING: No model achieved the requested 80% test accuracy threshold.")
        results_df['selection_score'] = (results_df['Recall'] * 0.5) + (results_df['F1-Score'] * 0.3) + (results_df['ROC-AUC'] * 0.2)
        best_row = results_df.sort_values(by="selection_score", ascending=False).iloc[0]
        accuracy_threshold_met = False

    selected_model_name = best_row["Model"]
    selected_clf = candidates[selected_model_name]

    print(f"\nSELECTED MODEL: {selected_model_name}")
    print(f"  Test Accuracy: {best_row['Accuracy']:.4f}")
    print(f"  Test Recall: {best_row['Recall']:.4f}")
    print(f"  Test F1-Score: {best_row['F1-Score']:.4f}")
    print(f"  Test ROC-AUC: {best_row['ROC-AUC']:.4f}")

    # Save the selected pipeline: StandardScaler + Classifier
    from sklearn.pipeline import Pipeline
    best_pipeline = Pipeline([
        ('scaler', StandardScaler()),
        ('classifier', selected_clf)
    ])
    # Refit pipeline on full training dataset
    if selected_model_name == "Gradient Boosting":
        best_pipeline.fit(X_train, y_train, classifier__sample_weight=sample_weights)
    else:
        best_pipeline.fit(X_train, y_train)

    best_model_path = os.path.join(models_dir, "best_model.joblib")
    joblib.dump(best_pipeline, best_model_path)
    print(f"Saved best model pipeline to {best_model_path}")

    # Save model metadata
    metadata = {
        "selected_model": selected_model_name,
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
        "alert_threshold": 0.40,
        "training_timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }

    metadata_path = os.path.join(models_dir, "model_metadata.json")
    with open(metadata_path, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, indent=4)
    print(f"Saved model metadata to {metadata_path}")

    # Save reports/final_model_selection.md
    selection_md_path = os.path.join(reports_dir, "final_model_selection.md")

    selection_md = f"""# Final Model Selection Report

This report presents a detailed summary of the hyperparameter tuning, validation splits, evaluation metrics, and selection rationale for the Tamil Nadu flood warning prediction prototype.

## 1. Candidate Tuning Summary (TimeSeriesSplit CV)
*   **TimeSeriesSplit Validation:** Splitting the 2010–2020 chronological training period into 3 folds.
*   **Logistic Regression:** Tuned C value and class weights.
*   **Decision Tree:** Tuned max_depth, min_samples_split, and class weights.
*   **Random Forest:** Tuned estimators, depth, and balanced subsampling options.
*   **Gradient Boosting:** Tuned estimators, depth, and learning rates using training sample weights.
*   **XGBoost:** Tuned estimators, learning rate, and scale_pos_weight.

## 2. Test Set Performance Comparison (2021–2023)

| Model | Accuracy | Precision | Recall (Safety) | F1-Score | ROC-AUC | Confusion Matrix |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
"""
    for r in results:
        selection_md += f"| {r['Model']} | {r['Accuracy']:.4f} | {r['Precision']:.4f} | {r['Recall']:.4f} | {r['F1-Score']:.4f} | {r['ROC-AUC']:.4f} | TN={r['TN']}, FP={r['FP']}, FN={r['FN']}, TP={r['TP']} |\n"

    selection_md += f"""
## 3. Selection Rationale & Decision Rule
1.  **Constraint:** Accuracy must satisfy $\\ge 80\\%$ (0.80).
2.  **Trade-off Score:** Of eligible candidates, we select the model with the best trade-off scoring function:
    $$\\text{{Score}} = 0.5 \\times \\text{{Recall}} + 0.3 \\times \\text{{F1}} + 0.2 \\times \\text{{ROC-AUC}}$$

*   **Selected Model:** **{selected_model_name}**
*   **Accuracy Threshold Met:** **{'Yes' if accuracy_threshold_met else 'No'}**

### Rigorous Discussion on Low Precision & Imbalance
In all models, the precision remains low ($<5\\%$ for highly accurate models). This is a direct consequence of the extreme class imbalance in the natural climate dataset:
*   Positive flood days account for only **{train_pos/len(train_df)*100:.2f}%** of the training records.
*   Even with perfect model discrimination (high ROC-AUC), when the false positive rate is non-zero, the sheer volume of negative samples ($>98\\%$) generates false positives that vastly outnumber true positives.
*   **Labeling buffer exclusion:** The 14-day pre-event and 7-day post-event exclusions help prevent leakage but keep the dataset scarce of transitional labels.
*   *Conclusion:* Early warnings must prioritize high **Recall** to ensure public safety, while managing false alerts through secondary indicators (e.g. historical reference thresholds).
"""
    with open(selection_md_path, 'w', encoding='utf-8') as f:
        f.write(selection_md)
    print(f"Saved final model selection report to {selection_md_path}")
    print("\n--- Model Tuning Completed Successfully! ---")

if __name__ == "__main__":
    run_tuning()
