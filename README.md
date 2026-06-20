# BigQuery Release Notes Hub 🚀

A modern, responsive, and high-performance web application designed to track, segment, and share Google Cloud BigQuery release notes. 

Built with a **Python Flask** backend and a premium **glassmorphism dark-mode vanilla frontend** (HTML, CSS, JavaScript).

---

## 🌟 Key Features

* **Granular Release Segmentation:** Automatically parses and splits multi-part daily release updates into standalone categorized items (e.g. `Feature`, `Announcement`, `Changed`, `Issue`, `Deprecated`).
* **Real-time Search & Filters:** Instantly search through update contents or filter entries by categories using client-side indexing.
* **In-Memory Intelligent Cache:** Caches external Google Cloud feeds for 5 minutes to deliver sub-millisecond loads and protect client runtimes from rate-limiting.
* **Force-Refresh Ability:** Bypass the caching mechanism on-demand using a simple spinning refresh button.
* **Smart Twitter/X Sharing Composer:**
  - Converts HTML update text into a clean plain-text draft.
  - Automatically handles URL-length counting rules (URLs are weighted as 23 characters).
  - Truncates summaries dynamically to stay strictly within X's 280-character limit.
  - Toggles hashtag chips (`#BigQuery`, `#GoogleCloud`, `#DataEngineering`, etc.) directly into/out of the text box.
* **Responsive Layout:** Beautiful grid-based mobile-responsive layout featuring modern glassmorphic cards and subtle backlighting glow effects.

---

## 📂 Project Structure

```text
bq-releases-notes/
├── app.py                 # Flask server & XML parsing controller
├── requirements.txt       # Python environment dependencies
├── .gitignore             # Git system & virtual environment ignores
├── templates/
│   └── index.html         # Main dashboard layout
└── static/
    ├── css/
    │   └── style.css      # Custom styling, fonts, & animations
    └── js/
        └── app.js         # State controller, HTML stripping, & Twitter sharing modal
```

---

## 🛠️ Technology Stack

* **Backend:** Python 3.9+, Flask, `requests`, `feedparser`
* **Frontend:** Vanilla HTML5, Vanilla CSS3 (custom CSS variables & gradients), Vanilla ES6 JavaScript (Fetch API, standard DOM manipulation)
* **Icons:** FontAwesome v6
* **Typography:** Google Fonts (Outfit & Plus Jakarta Sans)

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have **Python 3** installed:
```bash
python3 --version
```

### 2. Set Up Virtual Environment
Navigate to the project root and create a virtual environment:
```bash
# Navigate to project folder
cd bq-releases-notes

# Create virtualenv
python3 -m venv venv

# Activate virtualenv
source venv/bin/activate
```

### 3. Install Dependencies
Install the required packages listed in the requirements file:
```bash
pip install -r requirements.txt
```

### 4. Run the Server
Start the Flask application:
```bash
python3 app.py
```
By default, the server runs on **`http://127.0.0.1:5001`**.

---

## 🔌 API Documentation

### Get Release Notes
Fetch the parsed and structured release notes.

* **URL:** `/api/notes`
* **Method:** `GET`
* **Query Parameters:**
  - `refresh=true` (Optional): Forces cache invalidation and pulls a fresh copy from Google.
* **Success Response (200 OK):**
  ```json
  {
    "success": true,
    "status": "fetched",
    "count": 66,
    "notes": [
      {
        "date": "June 17, 2026",
        "updated_time": "2026-06-17T00:00:00-07:00",
        "type": "Feature",
        "content": "<p>You can enable autonomous embedding generation...</p>",
        "link": "https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026"
      }
    ]
  }
  ```

---

## 📝 License & Attribution
Data sourced from the [Google Cloud Feeds (BigQuery Release Notes)](https://docs.cloud.google.com/feeds/bigquery-release-notes.xml).
This application is created as a utility client for developers, data engineers, and cloud architects.
