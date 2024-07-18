import CONFIG from './config.js';

const apiBaseURL = CONFIG.API_BASE_URL;
let hlsInstance = null;
let qualityOptions = []; 
let currentVideoUrl = ''; 

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
        displayEpisodes(data.episodes, animeId, data.title, data.image); // Pass title and image

        // Automatically play the first episode if the episodeUrl is not provided in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const episodeUrl = urlParams.get('episodeUrl');
        if (!episodeUrl && data.episodes.length > 0) {
            watchEpisode(data.episodes[0].url, 1, animeId, data.title, data.image);
        } else if (episodeUrl) {
            // If episodeUrl is provided, play that episode
            const episodeNumber = data.episodes.findIndex(ep => ep.url === episodeUrl) + 1;
            watchEpisode(episodeUrl, episodeNumber, animeId, data.title, data.image);
        }
    } catch (error) {
        console.error('Error fetching anime info:', error);
    }
}

// Display episodes
function displayEpisodes(episodes, animeId, title, image) {
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
            <div class="episode-card" data-episode-number="${ep.number}" data-episode-url="${ep.url}" onclick="watchEpisode('${ep.url}', ${ep.number}, '${animeId}', '${title}', '${image}')">
                <div class="episode-header">
                    Ep ${ep.number}
                    <span class="progress-time">${progressTime}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Watch episode
window.watchEpisode = async function watchEpisode(url, episodeNumber, animeId, title, image) {
    console.log(`Watching episode: ${url}`);
    const episodeId = url.split('/').pop(); // Extract episodeId from URL
    const player = document.getElementById('videoPlayer');
    player.setAttribute('data-anime-id', animeId);
    player.setAttribute('data-episode-number', episodeNumber);
    player.setAttribute('data-title', title);
    player.setAttribute('data-image', image);
    await setVideoSource(episodeId, episodeNumber, animeId, title, image);
};

// Set video source and handle playback events
async function setVideoSource(episodeId, episodeNumber, animeId, title, image) {
    const player = document.getElementById('videoPlayer');
    console.log(`Fetching video source for episode ID: ${episodeId}`);

    try {
        const response = await fetch(`${apiBaseURL}/watch/${episodeId}?server=gogocdn`);
        if (!response.ok) {
            throw new Error('Failed to fetch streaming links');
        }
        const data = await response.json();
        console.log('Video source data:', data);
        const sources = data.sources;
        const captions = data.captions || [];

        if (!sources || sources.length === 0) {
            throw new Error('No valid video source found');
        }

        const highestQualitySource = sources.reduce((prev, current) => {
            const prevQuality = parseInt(prev.quality.replace('p', '')) || 0;
            const currentQuality = parseInt(current.quality.replace('p', '')) || 0;
            return currentQuality > prevQuality ? current : prev;
        }, sources[0]);

        console.log(`Setting video source to: ${highestQualitySource.url}`);
        currentVideoUrl = highestQualitySource.url; 

        // Remove existing tracks
        while (player.firstChild) {
            player.removeChild(player.firstChild);
        }

        // Add captions if available before initializing Plyr
        captions.forEach(caption => {
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = caption.label;
            track.srclang = caption.language;
            track.src = caption.url;
            track.default = caption.default || false;
            player.appendChild(track);
        });

        initializePlayerWithQualityOptions(player, sources);

        setPlayerSource(highestQualitySource.url, player, episodeId, episodeNumber, animeId, title, image);
    } catch (error) {
        console.error('Error setting video source:', error);
    }
}

// Initialize Plyr with quality options, playback speed, and captions
function initializePlayerWithQualityOptions(player, sources) {
    const controls = [
        'play-large', 'restart', 'rewind', 'play', 'fast-forward', 'progress', 
        'current-time', 'duration', 'mute', 'volume', 'captions', 'settings', 
        'pip', 'airplay', 'fullscreen', 'speed'
    ];

    qualityOptions = sources.map(source => ({
        label: source.quality,
        value: parseInt(source.quality.replace('p', '')),
        src: source.url
    }));

    const playerInstance = new Plyr(player, {
        controls,
        settings: ['quality', 'speed', 'captions'],
        quality: {
            default: qualityOptions[0].value,
            options: qualityOptions.map(option => option.value),
            forced: true,
            onChange: (newQuality) => updateQuality(newQuality, qualityOptions),
        },
        speed: {
            selected: 1,
            options: [0.5, 0.75, 1, 1.25, 1.5, 2]
        },
        captions: { 
            active: true, 
            language: 'auto', 
            update: true 
        }
    });

    playerInstance.on('ready', () => {
        const controlsContainer = playerInstance.elements.controls;
        if (controlsContainer) {
            // Add custom next episode button to Plyr controls
            const nextButton = document.createElement('button');
            nextButton.className = 'plyr__controls__item plyr__control';
            nextButton.type = 'button';
            nextButton.innerHTML = 'Next Episode';
            nextButton.title = 'Next Episode';
            nextButton.setAttribute('aria-label', 'Next Episode');
            nextButton.style.cssText = `
                background: none;
                border: none;
                cursor: pointer;
                padding: 0;
                margin: 0 5px;
            `;
            nextButton.addEventListener('click', handleNextEpisode);

            controlsContainer.appendChild(nextButton);
        }
    });

    player.plyr = playerInstance;

    playerInstance.on('ended', updateNextButtonVisibility);
    playerInstance.on('play', updateNextButtonVisibility);
}

// Update the visibility of the next episode button
function updateNextButtonVisibility() {
    const player = document.getElementById('videoPlayer');
    const animeId = player.getAttribute('data-anime-id');
    const currentEpisodeNumber = parseInt(player.getAttribute('data-episode-number'));
    const nextEpisode = document.querySelector(`.episode-card[data-episode-number="${currentEpisodeNumber + 1}"]`);
    const nextButton = document.querySelector('.plyr__control[aria-label="Next Episode"]');

    if (nextButton) {
        nextButton.style.display = nextEpisode ? 'inline-block' : 'none';
    }
}

// Set player source and handle playback
function setPlayerSource(url, player, episodeId, episodeNumber, animeId, title, image) {
    currentVideoUrl = url; // Update current video URL for download
    if (Hls.isSupported()) {
        hlsInstance = new Hls();
        hlsInstance.loadSource(url);
        hlsInstance.attachMedia(player);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('HLS manifest parsed, playing video');
            const progress = getWatchProgress(animeId, episodeNumber);
            if (progress) {
                player.currentTime = progress.time;
            }
            player.play().catch(error => console.error('Error playing video:', error));
        });
        hlsInstance.on(Hls.Events.ERROR, function(event, data) {
            console.error(`HLS error: ${data.type} - ${data.details}`);
        });

        player.plyr.on('qualitychange', event => {
            if (event.detail) {
                const newQuality = event.detail;
                updateQuality(newQuality, qualityOptions);
            }
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
        player.addEventListener('loadedmetadata', function() {
            console.log('Metadata loaded, playing video');
            const progress = getWatchProgress(animeId, episodeNumber);
            if (progress) {
                player.currentTime = progress.time;
            }
            player.play().catch(error => console.error('Error playing video:', error));
        });
    } else {
        console.error('HLS is not supported in this browser.');
    }

    player.onerror = function() {
        console.error('Error playing video');
    };

    player.addEventListener('pause', () => {
        saveWatchProgress(animeId, episodeNumber, player.currentTime, title, image);
        showPopupMessage(`Progress saved at ${formatTime(player.currentTime)}`);
    });

    player.addEventListener('ended', updateNextButtonVisibility);
}

// Handle the next episode button click
function handleNextEpisode() {
    const player = document.getElementById('videoPlayer');
    const animeId = player.getAttribute('data-anime-id');
    const currentEpisodeNumber = parseInt(player.getAttribute('data-episode-number'));
    const nextEpisodeNumber = currentEpisodeNumber + 1;
    const title = player.getAttribute('data-title');
    const image = player.getAttribute('data-image');

    const nextEpisode = document.querySelector(`.episode-card[data-episode-number="${nextEpisodeNumber}"]`);

    if (nextEpisode) {
        const nextEpisodeUrl = nextEpisode.getAttribute('data-episode-url');
        watchEpisode(nextEpisodeUrl, nextEpisodeNumber, animeId, title, image);
    } else {
        showPopupMessage('No more episodes to play.');
    }
}

// Update quality
function updateQuality(newQuality, qualityOptions) {
    console.log(`Quality changed to: ${newQuality}`);
    const selectedOption = qualityOptions.find(option => option.value === newQuality);
    if (selectedOption && hlsInstance) {
        hlsInstance.loadSource(selectedOption.src);
        hlsInstance.attachMedia(document.getElementById('videoPlayer'));
        currentVideoUrl = selectedOption.src; 
        console.log('Updated video URL for download:', currentVideoUrl);
    }
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
window.saveWatchProgress = function saveWatchProgress(animeId, episode, time, title, image) {
    const watchProgress = {
        animeId,
        episode,
        time,
        title,
        image,
        watchedAt: new Date().toISOString()
    };
    localStorage.setItem(`anime_${animeId}_episode_${episode}_progress`, JSON.stringify(watchProgress));

    let recentlyWatched = JSON.parse(localStorage.getItem('recentlyWatched')) || [];
    recentlyWatched = recentlyWatched.filter(item => !(item.animeId === animeId && item.episode === episode));
    recentlyWatched.unshift(watchProgress);
    if (recentlyWatched.length > 10) {
        recentlyWatched.pop();
    }
    localStorage.setItem('recentlyWatched', JSON.stringify(recentlyWatched));
}

// Get watch progress
window.getWatchProgress = function getWatchProgress(animeId, episode) {
    const progress = localStorage.getItem(`anime_${animeId}_episode_${episode}_progress`);
    return progress ? JSON.parse(progress) : null;
};

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const episodeUrl = urlParams.get('episodeUrl');
    const animeId = urlParams.get('id');

    console.log(`Page loaded with episodeUrl: ${episodeUrl} and animeId: ${animeId}`);

    if (animeId) {
        fetchAnimeInfo(animeId);
    } else {
        console.error('No anime ID provided');
    }

    // Ensure next episode button is always created and updated
    const player = document.getElementById('videoPlayer');
    player.addEventListener('loadeddata', () => {
        updateNextButtonVisibility();
    });
});
