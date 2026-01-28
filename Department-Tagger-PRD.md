# Product Requirement Document (PRD): Automated Department Tagger

## 1. Executive Summary
The **Department Tagger** is an automated data processing tool designed to categorize job titles into standardized functional departments (e.g., Engineering, Sales, Finance). By applying a robust, priority-based keyword matching algorithm, the tool aims to classify workforce data into meaningful segments for organizational analysis.

## 2. Problem Statement
Job titles often imply the department but do not explicitly state it. "Software Engineer" belongs to Engineering, "Account Executive" to Sales. Without an explicit department field, it is difficult to analyze headcount or costs by function using only raw titles.

## 3. High-Level Objectives
1.  **Classification**: Map job titles to a fixed set of ~10-12 core standardized departments.
2.  **Disambiguation**: Correctly handle roles that span multiple keywords (e.g., "Sales Engineer", "Product Marketing").
3.  **Automation**: Eliminate manual classification.
4.  **Coverage**: Maximize the % of titles successfully tagged, with a fallback for "Unclassified".

## 4. Functional Requirements

### 4.1 Data Cleaning
Same preprocessing as Level Tagger:
- Lowercase, trim whitespace.
- Remove special characters.
- Standardize separators.

### 4.2 Department Taxonomy
Each title is mapped to one primary department. The check is performed in **Priority Order** (Top to Bottom). The first category to match a keyword wins.

| Priority | Department | Key Keywords / Patterns | Example Titles |
| :--- | :--- | :--- | :--- |
| **1** | **Legal** | `legal`, `law`, `counsel`, `attorney`, `compliance`, `paralegal`, `privacy`, `regulatory` | General Counsel, Legal Ops |
| **2** | **Finance** | `finance`, `financial`, `accounting`, `accountant`, `controller`, `audit`, `tax`, `treasury`, `payroll`, `billing`, `accounts payable`, `accounts receivable`, `cfo` | CFO, Controller, Payroll Specialist |
| **3** | **HR / People** | `hr`, `human resources`, `people`, `talent`, `recruiting`, `recruiter`, `learning`, `training`, `culture`, `benefits`, `compensation`, `chro`, `diversity`, `employee relations` | HRBP, Recruiter, VP People |
| **4** | **Sales** | `sales`, `account executive`, `sdr`, `bdr`, `selling`, `revenue`, `business development`, `partnerships`, `channel`, `deals`, `cro` | VP Sales, AE, Sales Engineer |
| **5** | **Marketing** | `marketing`, `brand`, `growth`, `content`, `seo`, `sem`, `social media`, `demand gen`, `communications`, `pr`, `public relations`, `events`, `cmo` | CMO, Product Marketing Manager |
| **6** | **Product** | `product`, `ux`, `ui`, `user experience`, `product owner`, `cpo`, `roadmap` | Product Manager, CPO, UX Designer |
| **7** | **Customer Success** | `customer success`, `csm`, `client success`, `support`, `help desk` (check context), `service`, `care`, `onboarding`, `implementation`, `solutions architect` | CSM, VP Customer Success |
| **8** | **Engineering** | `engineer`, `engineering`, `developer`, `programmer`, `architect`, `r&d`, `devops`, `sre`, `qa`, `quality`, `software`, `tech`, `technology`, `cto`, `data science`, `data scientist`, `machine learning`, `ai` | Software Engineer, CTO, QA Lead |
| **9** | **IT** | `information technology`, `it`, `security` (check vs physical), `network`, `sysadmin`, `infrastructure`, `desktop`, `cio`, `ciso` | IT Director, System Admin |
| **10** | **Supply Chain** | `supply chain`, `procurement`, `logistics`, `transportation`, `materials`, `sourcing`, `buyer`, `purchasing`, `inventory`, `warehouse`, `distribution`, `fleet`, `freight`, `shipping` | VP Supply Chain, Procurement Manager, Logistics Coordinator |
| **11** | **Operations** | `operations`, `ops`, `facilities`, `office`, `admin`, `assistant`, `chief of staff`, `coo`, `project manager`, `program manager` | COO, VP Ops, Office Manager |
| **12** | **Executive** | `ceo`, `founder`, `chairman` (if not mapped elsewhere) | CEO, Co-Founder |
| **13** | **Others** | *Fall through* | Intern, Driver, Consultant |

### 4.3 Detailed Tagging Logic
**Rule**: Iterate through the Priority List from 1 to 13. Return the first match.

**Specific Resolution Examples:**
*   **"Sales Engineer"**:
    *   Check Legal (No) -> Finance (No) -> HR (No) -> **Sales** (Yes, keyword "sales").
    *   *Result*: Sales. (Correct, usually pre-sales/revenue function).
*   **"Product Marketing Manager"**:
    *   Check ... -> Sales (No) -> **Marketing** (Yes, keyword "marketing").
    *   *Result*: Marketing.
*   **"VP of Engineering"**:
    *   Check ... -> **Engineering** (Yes, keyword "engineering").
    *   *Result*: Engineering.
*   **"Chief Financial Officer"**:
    *   Check ... -> **Finance** (Yes, keyword "financial").
    *   *Result*: Finance.
*   **"HR Business Partner"**:
    *   Check Legal -> Finance -> **HR** (Yes, keyword "hr").
    *   *Result*: HR.

*   **"Supply Chain Manager"**:
    *   Check ... -> **Supply Chain** (Yes, keyword "supply chain").
    *   *Result*: Supply Chain.

### 4.4 Edge Cases & Handling Strategy

#### 1. "Design"
*   **Ambiguity**: Can be Product (UX/UI) or Marketing (Brand/Graphic).
*   **Strategy**:
    *   Add `ux`, `ui`, `user experience`, `product design` to **Product**.
    *   Add `brand`, `graphic`, `creative`, `art director` to **Marketing**.
    *   Generic "Designer" -> Map to **Product** (Default assumption in tech) OR **Marketing** based on business rule.
    *   *Current Config*: "Design" is not in top-level keywords to avoid false positives. Specific sub-types are used.

#### 2. "Analyst"
*   **Ambiguity**: Business Analyst, Data Analyst, Financial Analyst.
*   **Strategy**:
    *   "Financial Analyst" catches **Finance**.
    *   "Data Analyst" matches **Engineering** (via "Data") or **Product**.
    *   "Business Analyst" -> Often **Operations** or **Product** or **IT**.
    *   *Fallback*: If "Analyst" is the only keyword, it defaults to **Others** or **Operations** depending on strictness.

#### 3. "Project Manager"
*   **Strategy**: Map to **Operations** by default, unless specific prefix exists (e.g., "Engineering Project Manager" -> Engineering).

#### 4. "Consultant"
*   **Strategy**: Map to **Others** or **Professional Services** if added. Currently **Others**.
