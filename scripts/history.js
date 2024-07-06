import CONFIG from 'scripts/config.js';

const apiBaseURL = CONFIG.API_BASE_URL;
async function fetchRoute(route, params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseURL}/${route}?${query}`);
    if (!response.ok) {
        console.error(`Error: ${response.status} ${response.statusText}`);
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log(data); // Log API response for debugging
    return data;
}

function displayError(message) {
    const display = document.getElementById('dataDisplay');
    if (display) {
        display.textContent = message;
    }
}

function redirectToAnime(animeId) {
    window.location.href = `Anime.html?id=${animeId}`;
}

async function displayBookmarkedAnime() {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    const container = document.getElementById('bookmarked-anime');

    if (bookmarks.length > 0) {
        container.innerHTML = ''; // Clear the container first
        for (const animeId of bookmarks) {
            try {
                const anime = await fetchRoute(`info/${animeId}`);
                const isBookmarked = bookmarks.includes(anime.id) ? 'bookmarked' : '';
                const animeCard = `
                    <div class="anime-card" data-anime-id="${anime.id}" onclick="redirectToAnime('${anime.id}')">
                        <img src="${anime.image}" alt="${anime.title}">
                        <div class="type">${anime.type || 'TV'}</div>
                        <h3>${anime.title}</h3>
                        <p>${anime.releaseDate || ''}</p>
                        <p>${anime.genres ? anime.genres.join(', ') : ''}</p>
                        <i class="fas fa-bookmark bookmark-icon ${isBookmarked}" onclick="toggleBookmark(event, '${anime.id}')"></i>
                    </div>
                `;
                container.insertAdjacentHTML('beforeend', animeCard);
            } catch (error) {
                displayError(`Error fetching bookmarked anime: ${error.message}`);
            }
        }
        // Hide the loading screen after content is loaded
        document.getElementById('loading-screen').style.display = 'none';
    } else {
        container.innerHTML = '<p>No bookmarked anime.</p>';
        // Hide the loading screen if no anime is bookmarked
        document.getElementById('loading-screen').style.display = 'none';
    }
}

function showPopupMessage(message) {
    const popup = document.getElementById('popup-message');
    popup.textContent = message;
    popup.style.display = 'block';
    setTimeout(() => {
        popup.classList.add('show');
        setTimeout(() => {
            popup.classList.remove('show');
            setTimeout(() => {
                popup.style.display = 'none';
            }, 500);
        }, 2000);
    }, 10);
}

function toggleBookmark(event, animeId) {
    event.stopPropagation(); // Prevent triggering the card click event
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    const index = bookmarks.indexOf(animeId);
    if (index !== -1) {
        // Remove bookmark
        bookmarks.splice(index, 1);
        event.target.classList.remove('bookmarked');
        showPopupMessage(`${animeId} has been removed!`);
    } else {
        // Add bookmark
        bookmarks.push(animeId);
        event.target.classList.add('bookmarked');
        showPopupMessage(`${animeId} has been added!`);
    }
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
    displayBookmarkedAnime(); 
}

document.addEventListener('DOMContentLoaded', () => {
    displayBookmarkedAnime(); // Load bookmarked anime on page load
});
