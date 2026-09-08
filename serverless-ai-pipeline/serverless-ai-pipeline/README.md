# ⚙️ Serverless AI Pipeline: Physics Test Batch Transformation

> **Specialization:** Cloud-Native AI Automation & Applied Data Engineering  
> **Architectural Pattern:** Serverless Event-Driven Architecture (EDA)  
> **Tech Stack:** Google Apps Script (GAS), Google Gemini 3.6 Flash API, Google Drive API, Regular Expressions (Regex)

---

## 📌 Overview & Business Objective

Fully autonomous, serverless cloud pipeline engineered for batch processing, domain-specific technical translation, and deterministic mathematical masking of educational physics test datasets (`.txt`).

The solution addresses a fundamental vulnerability in generative AI: **stochastic LLMs cannot be trusted with exact arithmetic, raw ID masking, and strict formatting guarantees**. By decoupling semantic language translation from deterministic computation, this pipeline guarantees 100% calculation accuracy while maintaining high-fidelity, context-aware translation of rigorous physical terms.

---

## 🏗️ Architecture & System Workflow

```mermaid
flowchart TD
    A[Google Drive: Input Folder] -->|Fetch .txt Blobs| B(Apps Script Orchestrator)
    B --> C{Execution Budget Check\nElapsed Time > 300s?}
    C -->|Yes| D[Graceful Exit\nPending files deferred to next Trigger]
    C -->|No| E{Idempotency Guard:\nTarget 'ua_*.txt' exists?}
    E -->|Yes| F[Skip File & Log Info]
    E -->|No| G[Gemini 3.6 Flash API\nInference: System Prompt + Temp 0.1]
    G -->|HTTP 503 / Spike| H[Retry Backoff Handler\nUp to 3 attempts with 5s delay]
    H --> G
    G -->|Context-Preserved Translation| I[Deterministic Regex Engine\nExact Subtraction: num - MASK]
    I --> J[Google Drive: Output Folder\nPersist 'ua_*.txt']
    J --> K[Sleep 2000ms\nRPM Rate-Limit Throttling]
    K --> B
