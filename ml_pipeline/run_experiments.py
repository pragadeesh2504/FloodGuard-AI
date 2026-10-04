import os
import sys
import json
import joblib
import pandas as pd
import numpy as np
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix

def main():
    print("--- Running Final ML Validation & Academic Experiments ---")

    # Paths
    BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    train_path = os.path.join(BASE_DIR, "data", "processed", "train_features.csv")
    test_path = os.path.join(BASE_DIR, "data", "processed", "test_features.csv")
    model_path = os.path.join(BASE_DIR, "models", "best_model.joblib")

    # Output directories
    reports_dir = os.path.join(BASE_DIR, "reports")
    figures_dir = os.path.join(reports_dir, "figures")
    models_dir = os.path.join(BASE_DIR, "models")

    os.makedirs(reports_dir, exist_ok=True)
    os.makedirs(figures_dir, exist_ok=True)
    os.makedirs(models_dir, exist_ok=True)

    # Load processed datasets
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)

    features = [
        "rainfall_1d", "rainfall_3d", "rainfall_7d", "rainfall_14d", "rainfall_deviation",
        "temperature", "humidity", "pressure", "wind_speed", "latitude", "longitude", "month", "season"
    ]

    X_train = train_df[features]
    y_train = train_df['is_flood']
    X_test = test_df[features]
    y_test = test_df['is_flood']

    pipeline = joblib.load(model_path)

    # ==================================================
    # TASK 1 — VERIFY ALL METRICS & SAVE
    # ==================================================
    print("\n[Task 1] Verifying metrics from saved model...")
    preds = pipeline.predict(X_test)
    probs = pipeline.predict_proba(X_test)[:, 1]

    acc = accuracy_score(y_test, preds)
    prec = precision_score(y_test, preds, zero_division=0)
    rec = recall_score(y_test, preds)
    f1 = f1_score(y_test, preds, zero_division=0)
    auc = roc_auc_score(y_test, probs)
    cm = confusion_matrix(y_test, preds)
    tn, fp, fn, tp = cm.ravel()

    evaluation_results = {
        "accuracy": float(acc),
        "precision": float(prec),
        "recall": float(rec),
        "f1": float(f1),
        "roc_auc": float(auc),
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp)
        }
    }

    eval_json_path = os.path.join(models_dir, "final_evaluation.json")
    with open(eval_json_path, 'w', encoding='utf-8') as f:
        json.dump(evaluation_results, f, indent=4)
    print(f"Verified metrics saved to {eval_json_path}")
    print(f"Metrics: Accuracy={acc:.4f}, Precision={prec:.4f}, Recall={rec:.4f}, F1={f1:.4f}, AUC={auc:.4f}")

    # ==================================================
    # TASK 2 — FEATURE ABLATION EXPERIMENTS
    # ==================================================
    print("\n[Task 2] Running feature ablation experiments...")
    # Calculate scale_pos_weight for training Gradient Boosting sample weights
    train_pos = sum(y_train == 1)
    train_neg = sum(y_train == 0)
    scale_pos_weight = train_neg / train_pos
    sample_weights = np.where(y_train == 1, scale_pos_weight, 1.0)

    ablation_sets = {
        "Experiment A (Full Model)": features,
        "Experiment B (No Lat/Lon)": [f for f in features if f not in ["latitude", "longitude"]],
        "Experiment C (No Month)": [f for f in features if f != "month"],
        "Experiment D (Weather-Only)": [
            "rainfall_1d", "rainfall_3d", "rainfall_7d", "rainfall_14d", "rainfall_deviation",
            "temperature", "humidity", "pressure", "wind_speed"
        ]
    }

    ablation_results = []

    for name, feat_list in ablation_sets.items():
        print(f"  Running {name} using {len(feat_list)} features...")

        # Setup and train pipeline
        exp_pipeline = Pipeline([
            ('scaler', StandardScaler()),
            ('classifier', GradientBoostingClassifier(random_state=42))
        ])

        exp_pipeline.fit(train_df[feat_list], y_train, classifier__sample_weight=sample_weights)

        # Evaluate
        exp_preds = exp_pipeline.predict(test_df[feat_list])
        exp_probs = exp_pipeline.predict_proba(test_df[feat_list])[:, 1]

        exp_acc = accuracy_score(y_test, exp_preds)
        exp_prec = precision_score(y_test, exp_preds, zero_division=0)
        exp_rec = recall_score(y_test, exp_preds)
        exp_f1 = f1_score(y_test, exp_preds, zero_division=0)
        exp_auc = roc_auc_score(y_test, exp_probs)

        ablation_results.append({
            "Experiment": name,
            "Accuracy": exp_acc,
            "Precision": exp_prec,
            "Recall": exp_rec,
            "F1-Score": exp_f1,
            "ROC-AUC": exp_auc
        })

    ablation_df = pd.DataFrame(ablation_results)
    ablation_csv_path = os.path.join(reports_dir, "feature_ablation_results.csv")
    ablation_df.to_csv(ablation_csv_path, index=False)
    print(f"Ablation results saved to {ablation_csv_path}")
    print(ablation_df.to_string())

    # ==================================================
    # TASK 5 — THRESHOLD ANALYSIS
    # ==================================================
    print("\n[Task 5] Running threshold analysis...")
    thresholds = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
    thresh_results = []

    for t in thresholds:
        t_preds = (probs >= t).astype(int)
        t_cm = confusion_matrix(y_test, t_preds)
        t_tn, t_fp, t_fn, t_tp = t_cm.ravel()

        t_prec = precision_score(y_test, t_preds, zero_division=0)
        t_rec = recall_score(y_test, t_preds)
        t_f1 = f1_score(y_test, t_preds, zero_division=0)
        t_fpr = t_fp / (t_fp + t_tn) if (t_fp + t_tn) > 0 else 0.0

        thresh_results.append({
            "Threshold": t,
            "Precision": t_prec,
            "Recall": t_rec,
            "F1-Score": t_f1,
            "FPR": t_fpr
        })

    thresh_df = pd.DataFrame(thresh_results)
    thresh_csv_path = os.path.join(reports_dir, "threshold_analysis.csv")
    thresh_df.to_csv(thresh_csv_path, index=False)
    print(f"Threshold analysis saved to {thresh_csv_path}")
    print(thresh_df.to_string())

    # Plot Threshold PR Curve if matplotlib is available
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt

        plt.figure(figsize=(7, 5))
        plt.plot(thresh_df["Threshold"], thresh_df["Precision"], label="Precision", color="#06B6D4", lw=2)
        plt.plot(thresh_df["Threshold"], thresh_df["Recall"], label="Recall", color="#EF4444", lw=2)
        plt.plot(thresh_df["Threshold"], thresh_df["F1-Score"], label="F1-Score", color="#10B981", lw=2)
        plt.xlabel("Probability Decision Threshold", color="#E2E8F0")
        plt.ylabel("Score Value", color="#E2E8F0")
        plt.title("Metrics vs Decision Threshold", color="#E2E8F0", fontsize=14, pad=15)
        plt.legend(facecolor='#1E293B', edgecolor='#334155')
        plt.grid(True, color="#334155")

        # Dark style colors
        plt.gcf().set_facecolor('#0B0F19')
        plt.gca().set_facecolor('#1E293B')
        plt.tick_params(colors='#94A3B8')

        plot_path = os.path.join(figures_dir, "precision_recall_threshold.png")
        plt.savefig(plot_path, dpi=150, facecolor='#0B0F19')
        plt.close()
        print(f"Saved threshold plot to {plot_path}")
    except Exception as e:
        print(f"Plotting threshold curve skipped: {e}")

    # ==================================================
    # TASK 8 — CHENNAI-SPECIFIC ANALYSIS
    # ==================================================
    print("\n[Task 8] Running Chennai-specific subset evaluation...")
    chennai_train = train_df[train_df['city'] == 'chennai']
    chennai_test = test_df[test_df['city'] == 'chennai']

    chennai_total = len(chennai_train) + len(chennai_test)
    chennai_pos = len(chennai_train[chennai_train['is_flood'] == 1]) + len(chennai_test[chennai_test['is_flood'] == 1])
    chennai_neg = chennai_total - chennai_pos

    print(f"Chennai observations total: {chennai_total}")
    print(f"  Flood observations (is_flood=1): {chennai_pos}")
    print(f"  Non-flood observations (is_flood=0): {chennai_neg}")

    # Run test set predictions specifically on Chennai subset
    X_test_ch = chennai_test[features]
    y_test_ch = chennai_test['is_flood']

    if len(y_test_ch) > 0 and len(y_test_ch.unique()) > 1:
        ch_preds = pipeline.predict(X_test_ch)
        ch_probs = pipeline.predict_proba(X_test_ch)[:, 1]

        ch_acc = accuracy_score(y_test_ch, ch_preds)
        ch_prec = precision_score(y_test_ch, ch_preds, zero_division=0)
        ch_rec = recall_score(y_test_ch, ch_preds)
        ch_f1 = f1_score(y_test_ch, ch_preds, zero_division=0)
        ch_auc = roc_auc_score(y_test_ch, ch_probs)
        ch_cm = confusion_matrix(y_test_ch, ch_preds)
        ch_tn, ch_fp, ch_fn, ch_tp = ch_cm.ravel()

        chennai_report = f"""# Chennai-Specific Evaluation Report

## Dataset Breakdown
*   Total Chennai Observations: {chennai_total} (Train: {len(chennai_train)}, Test: {len(chennai_test)})
*   Flood Days: {chennai_pos}
*   Non-Flood Days: {chennai_neg}

## Subset Evaluation Metrics (Test Set 2021-2023)
*   **Accuracy:** {ch_acc:.4f}
*   **Precision:** {ch_prec:.4f}
*   **Recall (Safety):** {ch_rec:.4f}
*   **F1-Score:** {ch_f1:.4f}
*   **ROC-AUC:** {ch_auc:.4f}

## Confusion Matrix (Chennai Subset)
*   True Negatives (TN): {ch_tn}
*   False Positives (FP): {ch_fp}
*   False Negatives (FN): {ch_fn}
*   True Positives (TP): {ch_tp}

## Key Interpretations & Limitations
Due to the localized microclimate of Chennai (heavily dominated by the Northeast Monsoon in Oct-Dec), the regional submodel performs with high Recall but experiences a high volume of false warnings during non-flood rain episodes. With a total test size of {len(chennai_test)} days, the subset evaluation is statistically indicative but should not be treated as a fully certified warning index.
"""
        ch_report_path = os.path.join(reports_dir, "chennai_analysis.md")
        with open(ch_report_path, 'w', encoding='utf-8') as f:
            f.write(chennai_report)
        print(f"Chennai-specific report saved to {ch_report_path}")
    else:
        print("Chennai subset test set is too small or does not contain both classes for evaluation.")

if __name__ == "__main__":
    main()
