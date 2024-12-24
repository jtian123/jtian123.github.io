---
layout: page
title: Statistical Analysis and Causal Inference of Air Pollutants and Impact on Alzheimer’s Disease in Women 
description: A Study Supported by P01 Research Program Project Grants from National Institute on Aging
img: assets/img/dementia.jpg
importance: 1
category: work
---

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/la.jpg" title="Los Angeles" class="img-fluid rounded z-depth-1" %}
    </div>
</div>

This project-1 is funded by a prestigious [grant](https://reporter.nih.gov/project-details/9736434) from the [National Institute on Aging](https://www.nia.nih.gov/), focusing on the implications of urban air pollution on brain aging and the risk of dementia, with a specific emphasis on Alzheimer’s Disease (AD). Our study investigates how trafic-related air pollution (TRAP) afects the onset and progression of Alzheimer’s disease and related dementias (ADRD) within a large, nationwide cohort of women from the Women’s Health Initiative Memory Studies (WHIMS). This research is conducted under the auspices of USC, where our team is at the forefront of pioneering discoveries in environmental neurosciences concerning air pollution and brain aging. Further details about this grant are available from [USC website](https://today.usc.edu/national-institute-on-aging-grant-supports-research-on-air-pollution-and-alzheimers/).<br><br>

## Data Extraction and Reduction

Applied [MRIreduce](https://uscbiostats.github.io/MRIreduce/) package to convert NIfTI format T1/FL MRI images into structured, high-dimensional 2D data frames, focusing on Region of Interest (ROI) based processing. This package incorporates a key algorithm called `Partition`, which ofers a fast, flexible framework for agglomerative partitioning based on the Direct-Measure-Reduce approach. This method ensures that each reduced variable maintains a user-specified minimum level of information while being interpretable, as each maps uniquely to one variable in the reduced dataset. The [Partition](https://academic.oup.com/bioinformatics/article/36/3/676/5554652) algorithm, allows for customization in variable selection, measurement of information loss, and data reduction methods.

The package contains an image processing pipeline:

1. **Image Reorientation**
   - FSL's `fslreorient2std` function.

2. **Bias Correction**
   - N4 inhomogeneity correction.

3. **Brain Extraction**
   - FSL's Brain Extraction Tool.

4. **Brain Volume Calculation**
   - **Tissue Segmentation**: Segmenting the extracted brain image into white matter, grey matter, and cerebrospinal fluid (CSF) using the `fast` function from FSL.
   - Count white matter (WM) and grey matter (GM) voxels.
   - Multiply by the volume per voxel to obtain the brain volume in cubic centimeters.

5. **Image Registration**
   - The brain-extracted image is registered to the Eve brain template using FSL's `flirt` function. This aligns the individual brain image to a standard anatomical space for comparison and analysis.

6. **Extraction of Intensity Data**
   - Extract intensity values from the registered image into a 3D matrix for further analysis.

7. **Segmentation into White Matter, Grey Matter, and Cerebrospinal Fluid**
   - Create an integer array to classify each voxel as WM, GM, or CSF.

8. **ROI Labeling Following Eve Template**
   - Identify 130 Regions of Interest (ROIs).
   - Format data into a 2D matrix: rows represent samples, columns represent features corresponding to ROI locations in the brain.

9. **Super-Partition within ROIs**
   - **Clustering**: Create groups of data features based on their relationships measured by correlation.

10. **Partition within Super-Partition**
    - **Data Reduction**: Apply a fast and flexible framework for agglomerative partitioning.

11. **Calculation of Feature-Specific, Tissue-Specific Volumes within ROIs**

12. **Calculation of Feature-Specific, Tissue-Specific Intensities within ROIs**
    - Form four modules of data:
        - Grey Matter Intensities
        - Grey Matter Volumes
        - White Matter Intensities
        - White Matter Volumes

13. **Quantile Normalization**
    - Normalize across brain features within individual samples to account for MRI machine characteristics or settings that may differ between scans, reducing variability caused by different clinics or scanning times.
<br><br>

## Statistical Modeling

**Define:**

- $$Y_1$$: Brain feature variable at first Magnetic resonance imaging (MRI1)
- $$Y_2$$: Brain feature variable at second Magnetic resonance imaging (MRI2)
- $$X$$: Air pollution level by individual (pm2.5 or no2)
- $$X_c$$: Air pollution level averaged by clinic site c
- $$X_d$$: $$X - X_c$$
- $$W$$: Matrix of adjustment covariates without clinic and region

#### Baseline effect: Ordinal Regression Model

**Introduction of Ordinal Regression Model:**

Let Y to be an ordinal outcome with J categories by quartiles:

- **J_1**: $$([-\infty, Q_{25\%}])$$
- **J_2**: $$([Q_{25\%}, Q_{50\%}])$$
- **J_3**: $$([Q_{50\%}, Q_{75\%}])$$
- **J_4**: $$([Q_{75\%}, \infty])$$

Then, $$P(Y \leq j)$$ is the cumulative probability of $$Y$$ less than or equal to a specific category, $$j = 1,2, ..., J-1 $$. The odds of being less than or equal a particular category can be defined as

$$\frac{P(Y \leq j)}{Y > j}$$

The log odds  is also known as the logit, so that

$$log\frac{P(Y \leq j)}{Y > j} = logit(P(Y \leq j))$$

## Hypothesis Testing

**Test 1: Likelihood ratio test with MRI1 variabes and average air pollution effect of nested ordinal regression models**

Full model $$M_1$$:

$$logit(P(Y^*_1 \leq j)) = \alpha - \eta_0 W - \eta_1 X_c + \varepsilon$$

where, $$Y^*_1$$ is the ordinal outcome of $$Y_1$$

Reduced model $$M_0$$: 
    
$$logit(P(Y^*_1 \leq j)) = \alpha - \eta_0 W + \varepsilon$$

The likelihood ratio test statistic $$\Lambda$$ is given by:

$$\Lambda = -2 (\log L(M_0) - \log L(M_1))$$

Where:
- $$\log L(M_0)$$: Log-likelihood of the null model.
- $$\log L(M_1)$$: Log-likelihood of the alternative model.

#### Difference effect: Linear Regression Model

**Test 2: Likelihood ratio test with MRI1 variabes and average air pollution effect of nested linear regression models**

Full model $$M_1$$:

$$\frac{(Y_2 - Y_1)*5}{time_2 - time_1} = \alpha + \beta_0W + \beta_1X_c + \varepsilon$$

Reduced model $$M_0$$:

$$\frac{(Y_2 - Y_1)*5}{time_2 - time_1} = \alpha + \beta_0W + \varepsilon$$

The likelihood ratio test statistic $$\Lambda$$ is given by:

$$\Lambda = -2 (\log L(M_0) - \log L(M_1))$$

Where:
- $$\log L(M_0)$$: Log-likelihood of the null model.
- $$\log L(M_1)$$: Log-likelihood of the alternative model.<br><br>

<div class="row justify-content-center">
  <!-- First Image -->
  <div class="col-sm-6 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/gmvolume.png" title="gm_volume_test1_example" class="img-fluid rounded z-depth-1" %}
  </div>

  <!-- Second Image -->
  <div class="col-sm-6 mt-3 mt-md-0">
    {% include figure.liquid path="assets/img/gmintense.png" title="gm_intense_test1_example" class="img-fluid rounded z-depth-1" %}
  </div>
</div>

<br><br>

## Parallel Computing

Brain imaging data contain vast amounts of information, necessitating the use of parallel computing for efficient processing. To achieve this, I rely on the Slurm Workload Manager, commonly referred to as `Slurm` (formerly known as the Simple Linux Utility for Resource Management). Slurm is a free, open-source job scheduler designed for Linux and Unix-like systems and is widely used in supercomputers and computer clusters around the world. Specifically, I utilize the `slurmR` R package, which provides a lightweight and specialized wrapper for Slurm, streamlining its integration and usage within R workflows.<br><br>

## Visualization: Brain Image Mapping

The final step involves mapping the significant 2D brain features identified through statistical testing back to their corresponding 3D brain voxel locations. This functionality is implemented in my R package, **MRIreduce**, which facilitates masking the EVE template brain image with three orthogonal cuts for visualization. Below is an example of the output:<br><br>

<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/brain_image.png" title="Mask on Eve Template" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
