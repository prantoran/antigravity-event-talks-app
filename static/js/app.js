// ==========================================================================
// Application State
// ==========================================================================
let allNotes = [];
let filteredNotes = [];
let currentTypeFilter = 'all';
let currentSearchQuery = '';
let selectedNote = null;

// ==========================================================================
// DOM Elements
// ==========================================================================
const notesList = document.getElementById('notes-list');
const loadingSkeleton = document.getElementById('loading-skeleton');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const emptyState = document.getElementById('empty-state');
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const statusText = document.getElementById('status-text');
const statusDot = document.querySelector('.status-dot');
const searchInput = document.getElementById('search-input');
const clearSearchBtn = document.getElementById('clear-search-btn');
const filterButtonsContainer = document.getElementById('filter-buttons');
const retryBtn = document.getElementById('retry-btn');
const resetFiltersBtn = document.getElementById('reset-filters-btn');
const exportCsvBtn = document.getElementById('export-csv-btn');
const themeCheckbox = document.getElementById('theme-checkbox');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelTweetBtn = document.getElementById('cancel-tweet-btn');
const sendTweetBtn = document.getElementById('send-tweet-btn');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCounter = document.getElementById('char-counter');
const tweetDateBadge = document.getElementById('tweet-date-badge');
const tweetTypeBadge = document.getElementById('tweet-type-badge');
const tweetOriginText = document.getElementById('tweet-origin-text');
const hashtagChips = document.querySelectorAll('.hashtag-chip');

// Toast
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// ==========================================================================
// Initialization & Event Listeners
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Load Saved Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        if (themeCheckbox) themeCheckbox.checked = true;
        document.body.classList.add('light-mode');
    }

    fetchReleaseNotes(false);
    setupEventListeners();
});

function setupEventListeners() {
    // Refresh button
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    retryBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Search input
    searchInput.addEventListener('input', handleSearch);
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearSearchBtn.style.display = 'none';
        currentSearchQuery = '';
        applyFiltersAndSearch();
    });

    // Filter Buttons
    filterButtonsContainer.addEventListener('click', (e) => {
        const target = e.target.closest('.filter-btn');
        if (!target) return;
        
        // Update active class
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        target.classList.add('active');
        
        currentTypeFilter = target.dataset.type;
        applyFiltersAndSearch();
    });

    // Reset buttons on empty states
    resetFiltersBtn.addEventListener('click', resetFilters);

    // Export CSV button
    exportCsvBtn.addEventListener('click', exportToCSV);

    // Theme Switcher Toggle
    themeCheckbox.addEventListener('change', handleThemeChange);

    // Modal Close
    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });

    // Textarea input for character counter
    tweetTextarea.addEventListener('input', updateCharCounter);

    // Hashtag Chips Toggling
    hashtagChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const hashtag = chip.dataset.hashtag;
            toggleHashtagInTextarea(hashtag, chip);
        });
    });

    // Send/Share Tweet
    sendTweetBtn.addEventListener('click', shareOnTwitter);
}

// ==========================================================================
// API Operations
// ==========================================================================
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading();
    setConnectionStatus('Connecting...', 'yellow');

    try {
        const url = `/api/notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.success) {
            allNotes = result.notes;
            
            // Format Last Updated Text
            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const sourceStr = result.status === 'cached' ? ' (cached)' : ' (just fetched)';
            setConnectionStatus(`Updated at ${timeStr}${sourceStr}`, 'green');
            
            applyFiltersAndSearch();
        } else {
            throw new Error(result.error || 'Unknown server error');
        }
    } catch (err) {
        console.error('Fetch error:', err);
        setConnectionStatus('Connection Failed', 'red');
        showError(err.message);
    }
}

// ==========================================================================
// Filtering & Searching
// ==========================================================================
function handleSearch(e) {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    clearSearchBtn.style.display = currentSearchQuery.length > 0 ? 'block' : 'none';
    applyFiltersAndSearch();
}

function applyFiltersAndSearch() {
    filteredNotes = allNotes.filter(note => {
        // Filter by Type
        const matchesType = currentTypeFilter === 'all' || 
                            note.type.toLowerCase() === currentTypeFilter.toLowerCase();
                            
        // Filter by Search Query
        const plainText = stripHtml(note.content).toLowerCase();
        const matchesSearch = currentSearchQuery === '' || 
                              note.date.toLowerCase().includes(currentSearchQuery) ||
                              note.type.toLowerCase().includes(currentSearchQuery) ||
                              plainText.includes(currentSearchQuery);
                              
        return matchesType && matchesSearch;
    });

    renderNotes();
}

function resetFilters() {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    currentSearchQuery = '';
    
    currentTypeFilter = 'all';
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.type === 'all') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    applyFiltersAndSearch();
}

// ==========================================================================
// UI Rendering
// ==========================================================================
function renderNotes() {
    hideAllStates();
    
    if (filteredNotes.length === 0) {
        showEmptyState();
        return;
    }

    // Enable export button since we have items
    exportCsvBtn.disabled = false;

    notesList.innerHTML = '';
    filteredNotes.forEach((note, index) => {
        const card = document.createElement('article');
        card.className = 'note-card glass-panel';
        card.style.animationDelay = `${index * 0.05}s`;
        
        // Define badge style
        const standardTypes = ['Feature', 'Announcement', 'Changed', 'Issue', 'Deprecated'];
        const isStandard = standardTypes.includes(note.type);
        const typeAttr = isStandard ? `data-type="${note.type}"` : 'class="badge-type badge-type-other"';
        const typeClass = isStandard ? 'class="badge-type"' : '';

        card.innerHTML = `
            <div class="note-card-header">
                <span ${typeClass} ${typeAttr}>${note.type}</span>
                <span class="badge-date">
                    <i class="fa-regular fa-calendar"></i> ${note.date}
                </span>
            </div>
            <div class="note-card-body">
                ${note.content}
            </div>
            <div class="note-card-footer">
                <a href="${note.link}" target="_blank" rel="noopener noreferrer" class="card-link">
                    Read in docs <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
                <div class="card-actions-wrapper">
                    <button class="btn-copy-sm" onclick="copyNoteToClipboard(this, ${allNotes.indexOf(note)})" title="Copy to clipboard">
                        <i class="fa-regular fa-copy"></i> <span>Copy</span>
                    </button>
                    <button class="btn-tweet-sm" onclick="openTweetComposer(${allNotes.indexOf(note)})" title="Tweet update">
                        <i class="fa-brands fa-x-twitter"></i> Tweet
                    </button>
                </div>
            </div>
        `;
        
        notesList.appendChild(card);
    });
    
    notesList.style.display = 'grid';
}

// ==========================================================================
// Modal & Tweeting Logic
// ==========================================================================
window.openTweetComposer = function(noteIndex) {
    selectedNote = allNotes[noteIndex];
    if (!selectedNote) return;

    // Fill details
    tweetDateBadge.textContent = selectedNote.date;
    tweetTypeBadge.textContent = selectedNote.type;
    
    // Set colors for the type badge in the modal
    const standardTypes = ['Feature', 'Announcement', 'Changed', 'Issue', 'Deprecated'];
    if (standardTypes.includes(selectedNote.type)) {
        tweetTypeBadge.className = 'badge-type';
        tweetTypeBadge.setAttribute('data-type', selectedNote.type);
    } else {
        tweetTypeBadge.className = 'badge-type badge-type-other';
        tweetTypeBadge.removeAttribute('data-type');
    }

    // Strip HTML to get plain text
    const rawText = stripHtml(selectedNote.content);
    tweetOriginText.textContent = rawText;

    // Reset hashtag chips to default active state
    hashtagChips.forEach(chip => {
        if (['#BigQuery', '#GoogleCloud', '#DataEngineering'].includes(chip.dataset.hashtag)) {
            chip.classList.add('active');
        } else {
            chip.classList.remove('active');
        }
    });

    // Formulate initial tweet
    const baseText = `BigQuery ${selectedNote.type} (${selectedNote.date}):`;
    
    // We need to fit: Base text + content text + links/hashtags inside 280 chars
    // Default hashtags: #BigQuery #GoogleCloud #DataEngineering
    const defaultTags = '\n\n#BigQuery #GoogleCloud #DataEngineering';
    const link = `\n${selectedNote.link}`;
    
    // Available space for the summary content itself
    // Note: Twitter counts any URL as 23 characters
    const urlCount = 23;
    const reservedLength = baseText.length + defaultTags.length + urlCount + 5; // offset
    const availableLength = 280 - reservedLength;
    
    let contentText = rawText.trim();
    if (contentText.length > availableLength) {
        contentText = contentText.substring(0, availableLength - 3) + '...';
    }

    tweetTextarea.value = `${baseText} "${contentText}"${link}${defaultTags}`;
    
    updateCharCounter();
    showTweetModal();
};

function toggleHashtagInTextarea(hashtag, chipElement) {
    let text = tweetTextarea.value;
    
    if (chipElement.classList.contains('active')) {
        // Remove hashtag
        chipElement.classList.remove('active');
        
        // Remove hashtag with optional leading spaces or newlines
        const regex = new RegExp(`\\s*${hashtag}\\b`, 'g');
        text = text.replace(regex, '');
        
        // Clean up double spaces or trailing whitespace
        text = text.replace(/\s+/g, ' ').replace(/\s+$/, '');
        // Restore double newline before tags if it was broken
        if (text.includes('\n') && !text.includes('\n\n')) {
            text = text.replace(/(\n)(#)/g, '\n\n$2');
        }
    } else {
        // Add hashtag
        chipElement.classList.add('active');
        
        // Check if there are already hashtags at the end
        if (text.match(/#[a-zA-Z0-9]+/)) {
            // Append with a space
            text = text + ' ' + hashtag;
        } else {
            // Append with a double newline
            text = text + '\n\n' + hashtag;
        }
    }
    
    tweetTextarea.value = text;
    updateCharCounter();
}

function updateCharCounter() {
    const text = tweetTextarea.value;
    
    // Calculate length, correcting for URLs which X/Twitter counts as 23 characters
    // Regex for finding URLs
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = text.match(urlRegex) || [];
    
    let length = text.length;
    urls.forEach(url => {
        length = length - url.length + 23;
    });

    charCounter.textContent = `${length} / 280`;

    // Visual indicators for character limits
    charCounter.className = 'char-counter';
    if (length > 280) {
        charCounter.classList.add('limit-exceeded');
        sendTweetBtn.disabled = true;
    } else {
        sendTweetBtn.disabled = false;
        if (length > 250) {
            charCounter.classList.add('limit-near');
        }
    }
}

function shareOnTwitter() {
    const text = tweetTextarea.value;
    const tweetUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
    
    // Open Twitter Web Intent
    window.open(tweetUrl, '_blank', 'noopener,noreferrer,width=550,height=420');
    
    hideTweetModal();
    showToast('Redirected to Twitter/X sharing page!');
}

// ==========================================================================
// Helper Utility Functions
// ==========================================================================
function stripHtml(html) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Format list items nicely before stripping
    tempDiv.querySelectorAll('li').forEach(li => {
        li.textContent = `• ${li.textContent}\n`;
    });
    
    return tempDiv.textContent || tempDiv.innerText || '';
}

function setConnectionStatus(text, colorClass) {
    statusText.textContent = text;
    statusDot.className = `status-dot ${colorClass}`;
}

// State togglers
function showLoading() {
    hideAllStates();
    loadingSkeleton.style.display = 'grid';
    refreshIcon.classList.add('spinning');
    refreshBtn.disabled = true;
}

function hideLoading() {
    loadingSkeleton.style.display = 'none';
    refreshIcon.classList.remove('spinning');
    refreshBtn.disabled = false;
}

function showError(msg) {
    hideAllStates();
    errorMessage.textContent = msg;
    errorState.style.display = 'flex';
}

function showEmptyState() {
    hideAllStates();
    emptyState.style.display = 'flex';
}

function hideAllStates() {
    hideLoading();
    errorState.style.display = 'none';
    emptyState.style.display = 'none';
    notesList.style.display = 'none';
    exportCsvBtn.disabled = true;
}

function showTweetModal() {
    tweetModal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Lock background scroll
    tweetTextarea.focus();
}

function hideTweetModal() {
    tweetModal.style.display = 'none';
    document.body.style.overflow = ''; // Unlock background scroll
    selectedNote = null;
}

function showToast(message) {
    toastMessage.textContent = message;
    toast.style.display = 'flex';
    
    // Auto fadeout after 3.5s
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease-in forwards';
        setTimeout(() => {
            toast.style.display = 'none';
            toast.style.animation = ''; // Reset animation
        }, 300);
    }, 3500);
}

// ==========================================================================
// Copy to Clipboard Utility
// ==========================================================================
window.copyNoteToClipboard = function(button, noteIndex) {
    const note = allNotes[noteIndex];
    if (!note) return;

    const rawText = stripHtml(note.content).trim();
    const formattedText = `BigQuery ${note.type} (${note.date}):\n${rawText}\n\nRead more: ${note.link}`;

    navigator.clipboard.writeText(formattedText).then(() => {
        // Find elements inside button
        const icon = button.querySelector('i');
        const text = button.querySelector('span');
        
        // Provide visual feedback
        button.style.borderColor = 'var(--color-feature)';
        button.style.color = 'var(--color-feature)';
        if (icon) icon.className = 'fa-solid fa-check';
        if (text) text.textContent = 'Copied!';
        
        showToast('Copied release note to clipboard!');
        
        // Revert feedback after 2 seconds
        setTimeout(() => {
            button.style.borderColor = '';
            button.style.color = '';
            if (icon) icon.className = 'fa-regular fa-copy';
            if (text) text.textContent = 'Copy';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Failed to copy release note.');
    });
};

// ==========================================================================
// Export to CSV Utility (UTF-8, UTF-16, Blob safe)
// ==========================================================================
function exportToCSV() {
    if (filteredNotes.length === 0) return;
    
    const headers = ["Date", "Type", "Content", "Link"];
    const rows = [headers];
    
    filteredNotes.forEach(note => {
        const plainText = stripHtml(note.content).trim();
        rows.push([
            note.date,
            note.type,
            plainText,
            note.link
        ]);
    });
    
    // Map rows to escaped CSV format
    const csvContent = rows.map(row => 
        row.map(val => {
            const strVal = val === null || val === undefined ? "" : String(val);
            return `"${strVal.replace(/"/g, '""')}"`;
        }).join(",")
    ).join("\n");
    
    // Safe Blob download to support large files & special symbols
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement("a");
    downloadLink.setAttribute("href", url);
    
    const filterName = currentTypeFilter.toLowerCase();
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadLink.setAttribute("download", `bigquery_release_notes_${filterName}_${dateStr}.csv`);
    downloadLink.style.visibility = 'hidden';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    
    showToast('Exported release notes to CSV successfully!');
}

// ==========================================================================
// Theme Toggler Logic (Saves preference in LocalStorage)
// ==========================================================================
function handleThemeChange(e) {
    if (e.target.checked) {
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        showToast('Swapped to Light Theme!');
    } else {
        document.body.classList.remove('light-mode');
        localStorage.setItem('theme', 'dark');
        showToast('Swapped to Dark Theme!');
    }
}
