import re
import time
from flask import Flask, jsonify, render_template, request
import feedparser
import requests

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}
CACHE_DURATION = 300  # 5 minutes in seconds

def parse_release_notes(feed_content):
    """
    Parses the raw RSS feed XML content and structures the updates.
    """
    feed = feedparser.parse(feed_content)
    updates = []
    
    for entry in feed.entries:
        date_str = entry.get("title", "Unknown Date")
        updated_time = entry.get("updated", "")
        base_link = entry.get("link", FEED_URL)
        summary_html = entry.get("summary", "")
        
        # Split the HTML content by <h3> headers to get individual updates
        # e.g., <h3>Feature</h3><p>Description...</p>
        parts = re.split(r'(?i)<h3[^>]*>(.*?)</h3>', summary_html)
        
        # If there are no <h3> tags, treat the whole summary as one general update
        if len(parts) <= 1:
            # Clean up potential leading/trailing tags
            updates.append({
                "date": date_str,
                "updated_time": updated_time,
                "type": "Update",
                "content": summary_html.strip(),
                "link": base_link
            })
            continue
            
        # The first element is text before the first <h3> (should be empty or whitespace)
        # Subsequent elements are alternating header types and content
        for i in range(1, len(parts), 2):
            update_type = parts[i].strip()
            content_html = parts[i+1].strip() if i+1 < len(parts) else ""
            
            # Create a unique anchor link if possible
            # e.g., https://docs.cloud.google.com/bigquery/docs/release-notes#June_17_2026
            # We can sanitize the type to make a anchor link if the feed follows a pattern
            anchor = re.sub(r'[^a-zA-Z0-9]', '_', date_str)
            link = f"{base_link}#{anchor}" if base_link else FEED_URL
            
            updates.append({
                "date": date_str,
                "updated_time": updated_time,
                "type": update_type,
                "content": content_html,
                "link": link
            })
            
    return updates

def fetch_feed(force_refresh=False):
    """
    Fetches the feed, checking the cache first unless force_refresh is True.
    """
    now = time.time()
    if not force_refresh and cache["data"] is not None and (now - cache["last_fetched"] < CACHE_DURATION):
        return cache["data"], "cached"
        
    try:
        response = requests.get(FEED_URL, timeout=10)
        response.raise_for_status()
        
        # Parse updates
        updates = parse_release_notes(response.content)
        
        # Update cache
        cache["data"] = updates
        cache["last_fetched"] = now
        return updates, "fetched"
    except Exception as e:
        # If fetch fails, fallback to cache if available
        if cache["data"] is not None:
            return cache["data"], "fallback_cache"
        raise e

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def api_notes():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    try:
        notes, status = fetch_feed(force_refresh=force_refresh)
        return jsonify({
            "success": True,
            "status": status,
            "count": len(notes),
            "notes": notes
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5001)
