const apiBaseURL = 'https://animetize-api.vercel.app'; //temp API 

async function fetchAnimeInfo(animeId) {
    try {
        console.log(`Fetching anime info for ID: ${animeId}`);
        const response = await fetch(`${apiBaseURL}/info/${animeId}`);
        if (!response.ok) {
            throw new Error('Failed to fetch anime info');
        }
        const data = await response.json();
        console.log('Anime info fetched:', data);
        displayEpisodes(data.episodes);
    } catch (error) {
        console.error('Error fetching anime info:', error);
    }
}

function displayEpisodes(episodes) {
    const episodesContainer = document.getElementById('episodes-container');
    if (!episodes || episodes.length === 0) {
        console.error('No episodes found');
        episodesContainer.innerHTML = '<p>No episodes available</p>';
        return;
    }
    console.log('Displaying episodes:', episodes);
    episodesContainer.innerHTML = episodes.map(ep => `
        <div class="episode-card" onclick="watchEpisode('${ep.url}')">
            Ep ${ep.number}
        </div>
    `).join('');
    if (episodes.length > 0) {
        watchEpisode(episodes[0].url);
    }
}

async function watchEpisode(url) {
    console.log(`Watching episode: ${url}`);
    const episodeId = url.split('/').pop(); // Extract episodeId from URL
    await setVideoSource(episodeId);
}

async function setVideoSource(episodeId) {
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

        console.log(`Setting video source to: ${sources[0].url}`);
        createQualityButtons(sources);

        // Load the default quality
        setPlayerSource(sources[0].url, player);
    } catch (error) {
        console.error('Error setting video source:', error);
    }
}

function setPlayerSource(url, player) {
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(player);
        hls.on(Hls.Events.MANIFEST_PARSED, function() {
            console.log('HLS manifest parsed, playing video');
            player.play();
        });
        hls.on(Hls.Events.ERROR, function(event, data) {
            console.error(`HLS error: ${data.type} - ${data.details}`);
        });
    } else if (player.canPlayType('application/vnd.apple.mpegurl')) {
        player.src = url;
        player.addEventListener('loadedmetadata', function() {
            console.log('Metadata loaded, playing video');
            player.play();
        });
    } else {
        player.src = url;
        player.addEventListener('loadedmetadata', function() {
            console.log('Metadata loaded, playing video');
            player.play();
        });
    }

    player.onerror = function() {
        console.error('Error playing video');
    };
}

function createQualityButtons(sources) {
    const container = document.getElementById('videoOptions');
    container.innerHTML = ''; // Clear previous buttons

    sources.forEach(source => {
        const button = document.createElement('button');
        button.textContent = source.quality;
        button.onclick = () => setPlayerSource(source.url, document.getElementById('videoPlayer'));
        container.appendChild(button);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const episodeUrl = urlParams.get('episodeUrl');
    const animeId = urlParams.get('id');

    console.log(`Page loaded with episodeUrl: ${episodeUrl} and animeId: ${animeId}`);

    if (episodeUrl) {
        const episodeId = episodeUrl.split('/').pop();
        setVideoSource(episodeId);
    }

    if (animeId) {
        fetchAnimeInfo(animeId);
    } else {
        console.error('No anime ID provided');
    }
});
