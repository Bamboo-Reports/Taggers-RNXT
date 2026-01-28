# Product Requirement Document (PRD): Automated Level Tagger

## 1. Executive Summary
The **Level Tagger** is an automated data processing tool designed to categorize job titles into standardized seniority levels (e.g., C-Suite, VP, Director). By applying a robust, priority-based keyword matching algorithm, the tool aims to clean raw job title data and assign accurate seniority tags, enabling better segmentation, reporting, and analytics on workforce data.

## 2. Problem Statement
Raw job title data is often unstructured, inconsistent, and contains variations (e.g., "Vice President", "V.P.", "VP of Sales"). Manual tagging is time-consuming and prone to human error. Furthermore, complex titles containing multiple roles (e.g., "Head of Product & VP of Strategy") create ambiguity that simple keyword matching cannot resolve effectively.

## 3. High-Level Objectives
1.  **Standardization**: Normalize diverse job titles into a fixed set of seniority buckets.
2.  **Accuracy**: Correctly handle complex cases where multiple levels appear in a single string (Priority Resolution).
3.  **Automation**: Remove manual effort from the categorization process.
4.  **Robustness**: Systematically handle edge cases, special characters, and noise in the input data.

## 4. Functional Requirements

### 4.1 Data Cleaning
Before tagging, the system must preprocess the input string:
-   **Part-of-Speech Checks**: Identify if words like "Chief" or "General" are part of a compound title (e.g., "Chief of Staff" vs "Chief Executive Officer").
-   **Normalization**: Convert all text to lowercase.
-   **Noise Removal**: Remove special characters/punctuation (e.g., `&`, `/`, `-`, `|`, `()`) favoring space or empty string replacement to separate tokens.
-   **Spacing**: Collapse multiple spaces into single spaces.
-   **Tokenization**: Handle abbreviations (e.g., "sr." -> "senior", "assist." -> "assistant").

### 4.2 Level Taxonomy (Restructured)
Each title is mapped to exactly one primary level using a strict **top-down priority**.

| Tier | Level Name | Key Keywords / Patterns | Example Titles |
| :--- | :--- | :--- | :--- |
| **1** | **C-Suite** | `chief`, `c-level`, `cxo`, `ceo`, `cfo`, `cto`, `cio`, `cmo`, `coo`, `cso`, `chro`, `cpo`, `clo`, `cdo`, `ciso`, `cno`, `cco` | CEO, CFO, Chief People Officer |
| **2** | **President** | `president`, `vice-chair`, `chair`, `chairman`, `chairwoman` | President of Sales, Chairman |
| **3** | **VP** | `vice president`, `vp`, `v.p.`, `evp`, `svp`, `avp`, `executive vice president`, `senior vice president`, `assistant vice president` | VP of Product, EVP, SVP of Sales |
| **4** | **GM** | `general manager`, `gm` (if spelled out or clear context) | General Manager, GM of Operations |
| **5** | **Head** | `head of`, `global head`, `regional head` | Head of Business Development |
| **6** | **Director** | `director`, `senior director`, `managing director`, [md](file:///c:/Users/avisek-rnxt/.gemini/antigravity/brain/872ca34f-a05a-499f-9b28-bcab3c884ab0/task.md) (careful check) | Director of Finance, Senior Director, Managing Director |
| **7** | **Manager** | `manager`, `senior manager`, `mngr` | Engineering Manager, Senior Manager |
| **8** | **Lead** | `lead`, `team lead`, `lead engineer` | Team Lead, Tech Lead |
| **9** | **Others** | `analyst`, `specialist`, `engineer`, `associate`, `coordinator`, `officer`, `consultant`, `representative`, `advisor`, `staff`, `intern`, `trainee`, `junior`, `entry-level` | Sales Associate, Business Analyst, Intern |

### 4.3 Priority Rules (Core Logic)
**Rule**: If multiple levels appear, select the **highest priority** (Tier 1 is highest).

**Priority Order:**
1.  C-Suite
2.  President
3.  VP (Includes EVP, SVP, VP, AVP)
4.  GM
5.  Head
6.  Director (Includes Managing Director, Senior Director)
7.  Manager
8.  Lead
9.  Others (Includes Specialist, Intern, Entry, and all unmatched titles)

**Examples of Prioritization:**
*   "Head & VP of Business Development" -> **VP** (Tier 3 > Tier 5)
*   "Director & VP, Sales" -> **VP** (Tier 3 > Tier 6)
*   "Managing Director & President" -> **President** (Tier 2 > Tier 6)
*   "Senior Manager" -> **Manager** (Matches Tier 7)
*   "Team Lead" -> **Lead** (Matches Tier 8)
*   "Analyst" -> **Others** (Matches Tier 9)
*   "Random Title" -> **Others** (Default)

### 4.4 Edge Cases & Handling Strategy

#### 1. "Chief" Exceptions
*   **"Chief of Staff"**: Does not automatically map to C-Suite.
    *   *Rule*: If title contains "chief of staff" AND does NOT contain "CEO"/"COO"/"CFO", map to **Director** (or Manager, per business preference).

#### 2. "Partner"
*   **"Partner"**: Common in Legal/Consulting (high level) vs others.
    *   *Rule*: Map to **Director** unless distinct "Managing Partner" (Tier 6/Director or Tier 2/President context dependent) matches.

#### 3. Multiple Titles
*   "VP / Head of Sales" -> **VP**
*   "Chief & VP of Engineering" -> **C-Suite**

#### 4. Regional/Functional Prefixes
*   "Regional VP" -> **VP**
*   "Global Head" -> **Head**
*   "Country Manager" -> **Manager** (Unless specifically mapped to GM/Head. Defaulting to Manager rules).

#### 5. Abbreviations
*   **"GM"**: Only tag if isolated or in title context (e.g. "GM of X"). Avoid "General Motors".
*   **"MD"**: Ensure it's not "Medical Doctor". Maps to **Director** Tier.

#### 6. Hyphenated / Formatting
*   "VP-Sales", "V.P. of Sales", "VP/Sales" -> Reference cleanup step. All normalize to allow "vp" detection.
