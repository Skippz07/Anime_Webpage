import CONFIG from './config.js';

const apiBaseURL = CONFIG.API_BASE_URL;

let searchTimeout;

let genreIds = {
    action: null,
    adventure: null,
    comedy: null,
    drama: null,
    sports: null,
    isekai: null,
    thriller: null,
    sliceOfLife: null
};

async function fetchGenres() {
    try {
        const response = await fetch(`${apiBaseURL}/genre/list`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log('Fetched genres:', data); // Log the full response for debugging

        if (Array.isArray(data)) {
            data.forEach(genre => {
                const title = genre.title.toLowerCase();
                if (title === 'action') genreIds.action = genre.id;
                if (title === 'adventure') genreIds.adventure = genre.id;
                if (title === 'comedy') genreIds.comedy = genre.id;
                if (title === 'drama') genreIds.drama = genre.id;
                if (title === 'sports') genreIds.sports = genre.id;
                if (title === 'isekai') genreIds.isekai = genre.id;
                if (title === 'thriller') genreIds.thriller = genre.id;
                if (title === 'slice of life') genreIds.sliceOfLife = genre.id;
            });
            console.log('Genre IDs:', genreIds);
        } else {
            console.error('Invalid genres data:', data);
            displayError('Failed to load genres.');
        }
    } catch (error) {
        displayError(`Error fetching genres: ${error.message}`);
    }
}

async function fetchRoute(route, params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${apiBaseURL}/${route}?${query}`);
    if (!response.ok) {
        throw new Error('Network response was not ok');
    }
    const data = await response.json();
    console.log(data); // Log API response for debugging
    return data;
}

async function displayLatestEpisodes() {
    try {
        const data = await fetchRoute('recent-episodes', { page: 1, type: 1 });
        displayAnimeList(data.results, 'latest-episodes');
    } catch (error) {
        displayError(`Error fetching latest episodes: ${error.message}`);
    }
}

async function displayTopAiringAnime() {
    try {
        const data = await fetchRoute('top-airing', { page: 1 });
        displayAnimeList(data.results, 'top-airing-anime');
    } catch (error) {
        displayError(`Error fetching top airing anime: ${error.message}`);
    }
}

async function displayPopularMovies() {
    try {
        const data = await fetchRoute('movies', { page: 1 });
        displayAnimeList(data.results, 'popular-movies');
    } catch (error) {
        displayError(`Error fetching popular movies: ${error.message}`);
    }
}

async function displayGenreAnime(genreId, containerId) {
    if (!genreId) {
        await fetchGenres();
    }
    if (genreId) {
        try {
            const data = await fetchRoute(`genre/${genreId}`, { page: 1 });
            displayAnimeList(data.results, containerId);
        } catch (error) {
            displayError(`Error fetching anime: ${error.message}`);
        }
    }
}

async function searchAnime(query) {
    console.log(`Searching for: ${query}`);
    if (!query) {
        resetContent();
        return;
    }
    try {
        const data = await fetchRoute(`${query}`, { page: 1 });
        console.log('Search results:', data.results);
        if (Array.isArray(data.results)) {
            displayAnimeList(data.results, 'search-results-list');
            const searchResultsContainer = document.getElementById('search-results');
            const searchResultsTitle = document.getElementById('search-results-title');
            searchResultsTitle.textContent = `Search Results for: ${query}`;
            searchResultsContainer.style.display = 'block';
            hideOtherSections(); // Hide other sections when displaying search results
        } else {
            throw new Error('Invalid search results format');
        }
    } catch (error) {
        displayError(`Error searching anime: ${error.message}`);
    }
}

function hideOtherSections() {
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'none';
    });
}

function handleSearchInput() {
    const query = document.getElementById('search-input').value;
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    searchTimeout = setTimeout(() => {
        searchAnime(query);
    }, 300); // Adjust delay as needed
}

function displayAnimeList(animeList, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = animeList.map(anime => `
        <div class="anime-card" data-anime-id="${anime.id}" onclick="redirectToAnime('${anime.id}')">
            <img src="${anime.image}" alt="${anime.title}">
            <i class="fas fa-bookmark bookmark-icon" onclick="toggleBookmark(event, '${anime.id}')"></i>
            <h3>${anime.title}</h3>
            <p>${anime.releaseDate || ''}</p>
        </div>
    `).join('');
    loadBookmarks();
}

function displayError(message) {
    const display = document.getElementById('dataDisplay');
    display.textContent = message;
    display.style.display = 'block'; // Show the error message
}

function closeSidebar() {
    document.getElementById('sidebar').style.display = 'none';
}

window.redirectToAnime = function redirectToAnime(animeId) {
    window.location.href = `Anime.html?id=${animeId}`;
}

function resetContent() {
    document.getElementById('search-results').style.display = 'none';
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.display = 'block';
    });
    displayLatestEpisodes();
    displayTopAiringAnime();
    displayPopularMovies();
    displayGenreAnime(genreIds.action, 'action-anime');
    displayGenreAnime(genreIds.adventure, 'adventure-anime');
    displayGenreAnime(genreIds.comedy, 'comedy-anime');
    displayGenreAnime(genreIds.drama, 'drama-anime');
    displayGenreAnime(genreIds.sports, 'sports-anime');
    displayGenreAnime(genreIds.isekai, 'isekai-anime');
    displayGenreAnime(genreIds.thriller, 'thriller-anime');
    displayGenreAnime(genreIds.sliceOfLife, 'sliceoflife-anime');
}


window.saveWatchProgress = function saveWatchProgress(animeId, episode, time) {
    const watchProgress = {
        episode,
        time
    };
    localStorage.setItem(`anime_${animeId}_progress`, JSON.stringify(watchProgress));
}

window.getWatchProgress = function getWatchProgress(animeId) {
    const progress = localStorage.getItem(`anime_${animeId}_progress`);
    return progress ? JSON.parse(progress) : null;
}

window.toggleBookmark = function toggleBookmark(event, animeId) {
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
    displayBookmarkedAnime(); // Refresh the display
}

function loadBookmarks() {
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks')) || [];
    document.querySelectorAll('.anime-card').forEach(card => {
        const animeId = card.getAttribute('data-anime-id');
        const bookmarkIcon = card.querySelector('.bookmark-icon');
        if (bookmarks.includes(animeId)) {
            bookmarkIcon.classList.add('bookmarked');
        } else {
            bookmarkIcon.classList.remove('bookmarked');
        }
    });
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

window.scrollLeft = function scrollLeft(containerId) {
    const container = document.getElementById(containerId);
    container.scrollBy({
        left: -300,
        behavior: 'smooth'
    });
}

window.scrollRight = function scrollRight(containerId) {
    const container = document.getElementById(containerId);
    container.scrollBy({
        left: 300,
        behavior: 'smooth'
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    setTimeout(async () => {
        await fetchGenres();
        resetContent();
        document.getElementById('search-input').addEventListener('input', handleSearchInput);
        // Hide the loading screen after content is loaded
        document.getElementById('loading-screen').style.display = 'none';
    }, 4000); // Adjust this value for longer/shorter duration
});
