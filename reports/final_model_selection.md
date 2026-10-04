# Final Model Selection Report

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
| Logistic Regression | 0.6166 | 0.0079 | 0.9706 | 0.0156 | 0.9100 | TN=6667, FP=4165, FN=1, TP=33 |
| Decision Tree | 0.9764 | 0.0256 | 0.1765 | 0.0448 | 0.4167 | TN=10604, FP=228, FN=28, TP=6 |
| Random Forest | 0.9413 | 0.0311 | 0.5882 | 0.0590 | 0.8999 | TN=10208, FP=624, FN=14, TP=20 |
| Gradient Boosting | 0.7135 | 0.0105 | 0.9706 | 0.0208 | 0.9357 | TN=7720, FP=3112, FN=1, TP=33 |
| XGBoost | 0.9376 | 0.0306 | 0.6176 | 0.0583 | 0.8976 | TN=10167, FP=665, FN=13, TP=21 |

## 3. Selection Rationale & Decision Rule
1.  **Constraint:** Accuracy must satisfy $\ge 80\%$ (0.80).
2.  **Trade-off Score:** Of eligible candidates, we select the model with the best trade-off scoring function:
    $$\text{Score} = 0.5 \times \text{Recall} + 0.3 \times \text{F1} + 0.2 \times \text{ROC-AUC}$$

*   **Selected Model:** **XGBoost**
*   **Accuracy Threshold Met:** **Yes**

### Rigorous Discussion on Low Precision & Imbalance
In all models, the precision remains low ($<5\%$ for highly accurate models). This is a direct consequence of the extreme class imbalance in the natural climate dataset:
*   Positive flood days account for only **1.29%** of the training records.
*   Even with perfect model discrimination (high ROC-AUC), when the false positive rate is non-zero, the sheer volume of negative samples ($>98\%$) generates false positives that vastly outnumber true positives.
*   **Labeling buffer exclusion:** The 14-day pre-event and 7-day post-event exclusions help prevent leakage but keep the dataset scarce of transitional labels.
*   *Conclusion:* Early warnings must prioritize high **Recall** to ensure public safety, while managing false alerts through secondary indicators (e.g. historical reference thresholds).
