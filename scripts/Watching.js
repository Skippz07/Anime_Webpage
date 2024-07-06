import CONFIG from '/scripts/config.js';

const apiBaseURL = CONFIG.API_BASE_URL;
// Fetch anime info and display episodes
async function fetchAnimeInfo(animeId) {
    try {
        console.log(`Fetching anime info for ID: ${animeId}`);
        const response = await fetch(`${apiBaseURL}/info/${animeId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch anime info');
        }
        const data = await response.json();
        console.log('Anime info fetched:', data);
        displayEpisodes(data.episodes, animeId);
    } catch (error) {
        console.error('Error fetching anime info:', error);
    }
}

// Display episodes
function displayEpisodes(episodes, animeId) {
    const episodesContainer = document.getElementById('episodes-container');
    if (!episodes || episodes.length === 0) {
        console.error('No episodes found');
        episodesContainer.innerHTML = '<p>No episodes available</p>';
        return;
    }
    console.log('Displaying episodes:', episodes);

    episodesContainer.innerHTML = episodes.map(ep => {
        const progress = getWatchProgress(animeId, ep.number);
        const progressTime = progress ? formatTime(progress.time) : 'Not started';

        return `
            <div class="episode-card" onclick="watchEpisode('${ep.url}', ${ep.number}, '${animeId}')">
                <div class="episode-header">
                    Ep ${ep.number}
                    <span class="progress-time">${progressTime}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Watch episode
async function watchEpisode(url, episodeNumber, animeId) {
    console.log(`Watching episode: ${url}`);
    const episodeId = url.split('/').pop(); // Extract episodeId from URL
    await setVideoSource(episodeId, episodeNumber, animeId);
}

// Set video source and handle playback
async function setVideoSource(episodeId, episodeNumber, animeId) {
    const player = document.getElementById('videoPlayer');
    console.log(`Fetching video source for episode ID: ${episodeId}`);

    try {
        const response = await fetch(`${apiBaseURL}/watch/${episodeId}?server=gogocdn`);
        if (!response.ok) {
            throw new Error('Failed to fetch streaming links');
        }
        const data = await response.json();
        const sources = data.sources;

        if (!sources || sources.length === 0) {
            throw new Error('No valid video source found');
        }

        // Find the highest quality source (assuming 1080p is the highest)
        const highestQualitySource = sources.reduce((prev, current) => {
            const prevQuality = parseInt(prev.quality.replace('p', '')) || 0;
            const currentQuality = parseInt(current.quality.replace('p', '')) || 0;
            return currentQuality > prevQuality ? current : prev;
        }, sources[0]);

        console.log(`Setting video source to: ${highestQualitySource.url}`);
        createQualityButtons(sources, episodeNumber, animeId);

        // Load the highest quality source
        setPlayerSource(highestQualitySource.url, player, episodeId, episodeNumber, animeId);
    } catch (error) {
        console.error('Error setting video source:', error);
    }
}

// Set player source and handle playback events
function setPlayerSource(url, player, episodeId, episodeNumber, animeId) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(player);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('HLS manifest parsed, playing video');
            const progress = getWatchProgress(animeId, episodeNumber);
            if (progress) {
                player.currentTime = progress.time;
            }
            player.play();
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error(`HLS error: ${data.type} - ${data.details}`);
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
        player.addEventListener('loadedmetadata', function() {
            console.log('Metadata loaded, playing video');
            const progress = getWatchProgress(animeId, episodeNumber);
            if (progress) {
                player.currentTime = progress.time;
            }
            player.play();
        });
    } else {
        player.src = url;
        player.addEventListener('loadedmetadata', function() {
            console.log('Metadata loaded, playing video');
            const progress = getWatchProgress(animeId, episodeNumber);
            if (progress) {
                player.currentTime = progress.time;
            }
            player.play();
        });
    }

    player.onerror = function() {
        console.error('Error playing video');
    };

    // Save progress on pause
    player.addEventListener('pause', () => {
        saveWatchProgress(animeId, episodeNumber, player.currentTime);
        showPopupMessage(`Progress saved at ${formatTime(player.currentTime)}`);
    });
}

// Create quality buttons
function createQualityButtons(sources, episodeNumber, animeId) {
    const container = document.getElementById('videoOptions');
    container.innerHTML = ''; // Clear previous buttons

    sources.forEach(source => {
        const button = document.createElement('button');
        button.textContent = source.quality;
        button.onclick = () => setPlayerSource(source.url, document.getElementById('videoPlayer'), source.episodeId, episodeNumber, animeId);
        container.appendChild(button);
    });
}

// Show popup message
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

// Format time for display
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${minutes}:${sec < 10 ? '0' : ''}${sec}`;
}

// Save watch progress
function saveWatchProgress(animeId, episode, time) {
    const watchProgress = {
        episode,
        time
    };
    localStorage.setItem(`anime_${animeId}_episode_${episode}_progress`, JSON.stringify(watchProgress));
}

// Get watch progress
function getWatchProgress(animeId, episode) {
    const progress = localStorage.getItem(`anime_${animeId}_episode_${episode}_progress`);
    return progress ? JSON.parse(progress) : null;
}



document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const episodeUrl = urlParams.get('episodeUrl');
    const animeId = urlParams.get('id');

    console.log(`Page loaded with episodeUrl: ${episodeUrl} and animeId: ${animeId}`);

    if (episodeUrl && animeId) {
        const episodeId = episodeUrl.split('/').pop();
        const episodeNumber = 1; // Default to 1, should be replaced with actual episode number
        setVideoSource(episodeId, episodeNumber, animeId);
    }

    if (animeId) {
        fetchAnimeInfo(animeId);
    } else {
        console.error('No anime ID provided');
    }
});
