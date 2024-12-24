---
layout: page
title: Large-Scale Data Analysis with Genetic Variants and Asthma Control 
description: A research project, funded by the National Institute of Health (NIH) and in collaboration with Boston Children’s Hospital
img: assets/img/intro_gwas.png
importance: 2
category: work
toc: false
---
<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/NIH.png" title="NIH" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

# GWAS Pipeline

**A Genome-Wide Association Study (GWAS)** is a type of statistical analysis where we examine millions of genetic variants (features) across thousands of individuals to find patterns linked to a specific trait (outcome). This process is akin to a high-dimensional feature selection problem in machine learning.

-**Input data**: Genetic data (millions of SNPs), trait data (Asthma Control Score) and air pollution data (as covariates adjustment)

-**Objective**: Identify which genetic features (SNPs) are statistically associated with the trait.<br><br>

## Dimensionality Reduction

Use [Partition](https://github.com/USCbiostats/partition) algorithm, developed by Biostat department of USC, which is a fast and flexible framework for agglomerative partitioning. **Partition** uses an approach called **Direct-Measure-Reduce** to create new variables that maintain the user-specified minimum level of information. Each reduced variable is also interpretable: the original variables map to one and only one variable in the reduced data set. partition is flexible, as well: how variables are selected to reduce, how information loss is measured, and the way data is reduced can all be customized.

I applied a Partitioning method with a threshold of 0.8 to efficiently reduce the dataset containing millions of SNPs. The partitioner was configured with the following settings: **`Minimum Distance`** as the direct criterion, **`Intraclass Correlation (ICC)`** as the similarity measure, and **`Scaled Row Means`** as the reduction strategy.<br><br>

## Modeling and Association Testing: Two Linear regression models with F-test

**Model 1: Linear Regression with Interaction Term**

The first model incorporates an interaction term to examine the combined effect of SNP features and air pollution on asthma control scores:

**Model Formula**:

ACT ~ Covariates + AP + SNPs_reduced_feature + AP * SNPs_reduced_feature

**Analysis**:
- The **`Anova`** function in R is used with the F-test to determine the significance of the interaction term (`AP * SNPs_reduced_feature`) in the model.

**Model 2: Linear Regression without Interaction Term**

The second model excludes the interaction term to evaluate the main effects of air pollution and the SNP feature on asthma control scores:

**Model Formula**:

ACT(Asthma Control Score) ~ Covariates +AP + SNPs_reduced_feature

**Analysis**:
- The **`Anova`** function in R is used with the F-test to determine the significance of the SNPs_reduced_feature term in the model.


**Key Notes**:

1. **ACT** (Asthma Control Score) is the outcome variable in both models.
2. **AP** (Air Pollution) is included as a predictor in both models.
3. **SNPs_reduced_feature** represents a dimensionally reduced feature from genotype data using the Partition algorithm.
4. **Covariates** (Age, Race, Weight, and Sex) are included to adjust for potential confounders.
5. The F-test evaluates the significance of specific terms in each model:
   - **Model 1**: Focuses on the interaction term.
   - **Model 2**: Focuses on the main effect of SNPs_reduced_feature.
<br><br>

## Multiple Testing Correction

In statistical analysis, particularly in high-dimensional studies like Genome-Wide Association Studies (GWAS), multiple testing correction is a critical step to ensure the validity of results.

Here, I used **`fdrci`** package, which is also developed by USC Biostat. FDR functions for **permutation-based** estimators, including pi0 as well as FDR confidence intervals. The confidence intervals account for dependencies between tests by the incorporation of an overdispersion parameter, which is estimated from the permuted data. More information about the R package can be found [here](https://github.com/USCbiostats/fdrci).<br><br>

## Result Interpretation

A **Manhattan plot** is a type of scatter plot used to display the results of a GWAS. It shows the statistical significance of the association between genetic variants(SNPs) and a trait across the entire genome.

Features of a Manhattan Plot:

1. **X-Axis**:
    - Represents the genomic coordinates of SNPs, typically grouped and ordered by chromosome.
    - Each chromosome is shown sequentially, often using alternating colors to differentiate them.

2. **Y-Axis**:
    - Represents the genomic coordinates of SNPs, typically grouped and ordered by chromosome.
    - Each chromosome is shown sequentially, often using alternating colors to differentiate them.

3. **Threshold Line**:
    -A horizontal line indicates the genome-wide significance threshold, SNPs above this line are considered significant.

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/manh_plot1.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/manh_plot2.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
    Two sample Manhanttan Plots from my analysis.
</div>
