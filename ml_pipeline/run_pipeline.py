import os
import sys

def main():
    print("==================================================")
    print("FLOODGUARD AI — END-TO-END REPRODUCIBLE ML PIPELINE")
    print("==================================================")

    current_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.append(current_dir)

    # Step 1: Download / Cache / Prepare real datasets
    print("\n[STEP 1] Running download_or_import_data.py...")
    from download_or_import_data import main as download_main
    download_main()

    # Step 2: Data inspection
    print("\n[STEP 2] Running inspect_data.py...")
    from inspect_data import inspect_ifi
    inspect_ifi()

    # Step 3: Cleaning, labeling & buffer exclusion
    print("\n[STEP 3] Running preprocess.py...")
    from preprocess import clean_and_align_data
    clean_and_align_data()

    # Step 4: Feature engineering, baseline calculation, and splitting
    print("\n[STEP 4] Running feature_engineering.py...")
    from feature_engineering import run_feature_engineering
    run_feature_engineering()

    # Step 5: Model training, comparison, ablation, and standalone Chennai evaluation
    print("\n[STEP 5] Running train.py...")
    from train import run_training
    run_training()

    # Step 5b: Rigorous Hyperparameter Tuning
    print("\n[STEP 5b] Running tune_models.py...")
    from tune_models import run_tuning
    run_tuning()

    # Step 6: Detailed model evaluation and threshold tuning
    print("\n[STEP 6] Running evaluate.py...")
    from evaluate import run_evaluation
    run_evaluation()

    # Step 7: Academic Validation
    print("\n[STEP 7] Running academic_validation.py...")
    from academic_validation import run_academic_validation
    run_academic_validation()

    print("\n==================================================")
    print("SUCCESS: REPRODUCIBLE ML PIPELINE EXECUTED SUCCESSFULLY!")
    print("==================================================")

if __name__ == "__main__":
    main()
