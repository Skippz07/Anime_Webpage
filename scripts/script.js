const apiBaseURL = 'https://animetize-api-wgiz.onrender.com';

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

async function fetchRoute(route, params = {}, pageLimit = 3) {
    let results = [];
    for (let page = 1; page <= pageLimit; page++) {
        const query = new URLSearchParams({ ...params, page }).toString();
        const response = await fetch(`${apiBaseURL}/${route}?${query}`);
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        console.log(data); // Log API response for debugging
        results = results.concat(data.results);
    }
    return results;
}

async function displayLatestEpisodes() {
    try {
        const results = await fetchRoute('recent-episodes', { type: 1 }, 3);
        displayAnimeList(results, 'latest-episodes');
    } catch (error) {
        displayError(`Error fetching latest episodes: ${error.message}`);
    }
}

async function displayTopAiringAnime() {
    try {
        const results = await fetchRoute('top-airing', {}, 3);
        displayAnimeList(results, 'top-airing-anime');
    } catch (error) {
        displayError(`Error fetching top airing anime: ${error.message}`);
    }
}

async function displayPopularMovies() {
    try {
        const results = await fetchRoute('movies', {}, 3);
        displayAnimeList(results, 'popular-movies');
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
            const results = await fetchRoute(`genre/${genreId}`, {}, 3);
            displayAnimeList(results, containerId);
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
        console.log('Search results:', data);
        displayAnimeList(data.results, 'latest-episodes');
        document.getElementById('current-genre').textContent = `Search Results for: ${query}`;
    } catch (error) {
        displayError(`Error searching anime: ${error.message}`);
    }
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
            <h3>${anime.title}</h3>
            <p>${anime.releaseDate || ''}</p>
            <p>${anime.genres ? anime.genres.join(', ') : ''}</p>
            <i class="fas fa-bookmark bookmark-icon" onclick="toggleBookmark(event, '${anime.id}')"></i>
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

function redirectToAnime(animeId) {
    window.location.href = `Anime.html?id=${animeId}`;
}

function resetContent() {
    document.getElementById('current-genre').textContent = 'Now Showing: All Anime';
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

function saveWatchProgress(animeId, episode, time) {
    const watchProgress = {
        episode,
        time
    };
    localStorage.setItem(`anime_${animeId}_progress`, JSON.stringify(watchProgress));
}

function getWatchProgress(animeId) {
    const progress = localStorage.getItem(`anime_${animeId}_progress`);
    return progress ? JSON.parse(progress) : null;
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

function scrollLeft(containerId) {
    const container = document.getElementById(containerId);
    container.scrollBy({
        left: -300,
        behavior: 'smooth'
    });
}

function scrollRight(containerId) {
    const container = document.getElementById(containerId);
    container.scrollBy({
        left: 300,
        behavior: 'smooth'
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    await fetchGenres();
    resetContent();
});
