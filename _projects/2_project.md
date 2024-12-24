---
layout: page
title: Tackling Beam Decay at CERN with Machine Learning
description: Built up a prediction system with XGBoost
img: assets/img/cern.jpg
importance: 3
category: work
giscus_comments: false
---

This remarkable project was completed during my time at [Utrecht University](https://en.wikipedia.org/wiki/Utrecht_University) as part of a co-op opportunity with [CERN](https://home.cern/), the European Organization for Nuclear Research.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/Sunset_uu.jpg" title="Utrecht University" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Sunset look from my dorm of Utrecht University. 
</div>

Over the past decade, the **Large Hadron Collider (LHC)** has been the crown jewel of CERN, playing a pivotal role in groundbreaking discoveries like the Higgs boson and numerous other particles. But behind the scenes, a lesser-known yet equally fascinating component of the CERN accelerator complex is **LINAC3**. This intricate machine is the starting point for the ion beams that fuel the LHC and many other experiments at CERN.

However, operating LINAC3 is no small feat. Its performance relies on a vast number of input parameters, and this complexity often leads to significant fluctuations in the intensity of its output ion beam. Addressing this challenge became the focus of an exciting research project: **How can we leverage modern machine learning to predict and prevent beam decay, and uncover the factors driving these changes?**<br><br>

## Our Approach

To tackle this question, our team divided into three subgroups, each exploring a unique approach:

1. **Time Series Analysis** – Investigating patterns and trends over time to identify potential indicators of decay.
2. **Data Reduction and Feature Selection** – Simplifying the data to highlight the most critical parameters influencing beam stability.
3. **Neural Networks** – Harnessing deep learning models to capture complex relationships in the data.<br><br>

## My Contribution: XGBoost

For my part, I dove into applying the powerful **XGBoost algorithm** to develop a predictive model. With its ability to handle high-dimensional data and uncover non-linear relationships, XGBoost proved to be a promising tool in our quest to better understand and mitigate beam variability.

My goal was twofold:

- **Create an early warning system** to alert operators about potential beam decay.
- **Provide actionable insights** into the root causes of these fluctuations.

### Key Enhancements of XGBoost

1. **Two Forms of Regularization**  
   XGBoost incorporates regularization techniques to reduce the risk of overfitting:

   - **L1 Regularization (LASSO):** Pushes feature weights to zero, controlled by the `alpha` parameter.
   - **L2 Regularization (Ridge):** Gradually pushes feature weights asymptotically to zero, controlled by the `lambda` parameter.

2. **Gamma Parameter for Tree Complexity**  
   The `gamma` parameter controls the complexity of a tree. It sets the minimum reduction in loss required to make an additional split on a leaf node. During pruning, XGBoost uses this parameter to determine which leaf nodes to remove, ensuring trees are both effective and efficient.

3. **Scalability and Parallel Distributed Computing**  
   The most critical factor behind XGBoost's success is its **scalability**:
   - XGBoost runs more than ten times faster than existing popular solutions on a single machine.
   - It scales to billions of examples in distributed or memory-limited settings.
   - Through **parallel and distributed computing**, it accelerates learning, enabling quicker model exploration.
   - XGBoost also supports **out-of-core computation**, allowing data scientists to process hundreds of millions of examples on a standard desktop.

These enhancements make XGBoost a powerful and flexible tool, widely used in competitive data science and industry applications.

### Data Preprocessing

The sensor data contains noticeable stochastic “jittering,” a type of noise where the sensor value drops significantly for a short period. To address this, I used an exponential rolling average to smooth the data. The exponential rolling average calculates the rolling mean over a subset of the data, giving greater weight to the most recent points. This approach was chosen to effectively reduce the jittering while preserving important details and maintaining the system’s ability to quickly adapt to new values. Additionally, I ensured that the method retained enough information to analyze the extent of the jittering.

### Key Steps and Methodology

- **Feature Engineering**:  
  After analyzing the data, I found that using the **rolling means of sensor features** significantly improved prediction performance, yielding the highest R² and lowest RMSE. One sensor feature, `IP.NSRCGEN:RFTHOMSONAQNREV`, was excluded as it contained only zeros.

- **Dimensionality Reduction**:  
  To manage computational complexity, I applied **Principal Component Analysis (PCA)**. This reduced the number of features from 16 to 7 while retaining the most important information, making the modeling process more efficient.

- **Dataset Preparation**:  
  I divided the data into training and testing sets:
  - **Training Dataset**: Mid-April to mid-November 2018.
  - **Testing Dataset**: Mid-November to mid-December 2018.  
    To validate the model, the testing dataset was further split into 70% for fitting and 30% for forecasting using random sampling.

### Parameter Tuning for Optimal Performance

Fine-tuning model parameters was essential to improve accuracy and performance. Here’s what I did:

- Adjusted **learning rates** (typically ranging between 0.05 and 0.3) and determined the optimal number of decision trees using XGBoost's cross-validation function.
- Tuned key parameters, including:
  - **Max Depth**: Controls the complexity of the trees.
  - **Minimum Child Weight**: Prevents overfitting by ensuring minimum data points in leaf nodes.
  - **Gamma**: Controls tree splits by setting a minimum loss reduction threshold.
  - **Subsample and Colsample by Tree**: Adjusted to improve model robustness.

After multiple iterations, the best parameter combination included:

- Learning Rate: **0.05**
- Max Depth: **9**
- Subsample: **0.9**
- Number of Estimators: **3000**

### Results and Insights

- The XGBoost model performed exceptionally well in capturing **change trends** of beam current, particularly during regions of sudden decay.
- While the model struggled with predicting exact values due to the inherent noise and variability, it effectively provided **early warnings** and actionable insights.
- A key discovery was the model's ability to highlight **patterns and trends**, enabling operators to take preventive measures before significant beam decay occurred.

To test robustness, I conducted targeted predictions in specific regions where beam decay was most prominent. By excluding one region at a time from the testing set and using it as a forecasting target, the model consistently captured the general trend of beam changes, even though fluctuations in predictions remained.

### Key Takeaways

This project demonstrates how **machine learning** can transform complex scientific problems into manageable, data-driven solutions. By combining:

- **Feature Engineering** to focus on the most impactful data.
- **Dimensionality Reduction** for computational efficiency.
- **Rigorous Model Tuning** for optimal performance.

<div class="row justify-content-center">
  <!-- First Image -->
  <div class="col-sm-6 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/xgb1.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
  </div>

  <!-- Second Image -->
  <div class="col-sm-6 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/xgb2.jpg" title="example image" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

**Read more about the report from [download](<(/assets/docs/cern_pdf.pdf)>)**
