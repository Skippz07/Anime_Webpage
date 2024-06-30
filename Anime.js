const apiBaseURL = 'https://animetize-api-wgiz.onrender.com';

async function fetchAnimeInfo(animeId) {
    try {
        const response = await fetch(`${apiBaseURL}/info/${animeId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch anime info');
        }
        const data = await response.json();
        displayAnimeInfo(data);
    } catch (error) {
        console.error('Error fetching anime info:', error);
        document.getElementById('anime-title').textContent = 'Error fetching anime info';
    }
}

function displayAnimeInfo(anime) {
    document.getElementById('background').style.backgroundImage = `url(${anime.image})`;
    document.getElementById('anime-poster').src = anime.image;
    document.getElementById('anime-title').textContent = anime.title;
    document.getElementById('anime-description').textContent = anime.description || 'No description available';
    document.getElementById('anime-genres').textContent = anime.genres.join(', ');
    document.getElementById('anime-releaseDate').textContent = anime.releaseDate || 'Unknown';
    document.getElementById('anime-status').textContent = anime.status;
    document.getElementById('anime-otherName').textContent = anime.otherName || 'N/A';
    
    const episodesContainer = document.getElementById('episodes-container');
    episodesContainer.innerHTML = anime.episodes.map(ep => `
        <div class="episode-card" onclick="watchEpisode('${ep.url}', '${anime.id}')">
            Ep ${ep.number}
        </div>
    `).join('');
}

function watchEpisode(url, animeId) {
    window.location.href = `Watching.html?episodeUrl=${encodeURIComponent(url)}&id=${encodeURIComponent(animeId)}`;
}

document.getElementById('watch-now-btn').addEventListener('click', () => {
    const firstEpisodeUrl = document.querySelector('.episode-card')?.onclick.toString().match(/'(.+?)'/)[1];
    const animeId = new URLSearchParams(window.location.search).get('id');
    if (firstEpisodeUrl) {
        watchEpisode(firstEpisodeUrl, animeId);
    } else {
        alert('No episodes available to watch');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const animeId = urlParams.get('id');
    if (animeId) {
        fetchAnimeInfo(animeId);
    } else {
        document.getElementById('anime-title').textContent = 'No anime selected';
    }
});
