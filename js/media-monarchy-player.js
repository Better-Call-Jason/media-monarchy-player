// Media Monarchy Stream Widget
(function() {
    // Widget configuration
    const config = {
        baseUrl: 'https://mediamonarchy.live',
        defaultTheme: 'dark',
        defaultStream: 'music',
        defaultVolume: 0.5,
        retryAttempts: 20,
        retryDelay: 15000,
        streamSwitchBuffer: 300000,
        metadataRefreshInterval: 60000,
        // Define MST schedule in UTC
        scheduleUTC: {
            startHour: 16, // 9AM MST = 16:00 UTC
            endHour: 0,    // 5PM MST = 00:00 UTC next day
        }
    };

    // Stream types and their metadata
    const streams = {
        onair: {
            title: 'Media Monarchy Live Broadcast',
            stream: /onair_stream
        },
        music: {
            title: 'PUTV All Genres Radio',
            stream: '/stream'
        },
        news: {
            title: 'Morning Monarchy Archive Radio',
            stream: '/stream3'
        },
        rock: {
            title: 'PUTV Rock Radio',
            stream: '/stream5'
        },
        techno: {
            title: 'PUTV Techno Radio',
            stream: '/stream6'
        },
        country: {
            title: 'PUTV Country Radio',
            stream: '/stream4'
        },
        eclectic: {
            title: 'PUTV Eclectic Radio',
            stream: '/stream7'
        },
        pop: {
            title: 'PUTV Pop Radio',
            stream: '/stream8'
        }
    };

    class MediaMonarchyPlayer {
        constructor(container, options = {}) {
            this.container = container;
            this.options = {
                theme: options.theme || config.defaultTheme,
                stream: options.stream || config.defaultStream,
                width: options.width || '99%',
                height: options.height || '63%'
            };
            
            this.isPlaying = false;
            this.isLoading = false;
            this.sound = null;
            this.retryCount = 0;
            this.metadataInterval = null;
            this.volume = config.defaultVolume;
            this.streamCheckInterval = null;
            this.lastStreamUrl = null;
            this.streamSwitchStartTime = null;
            this.init();
        }

        init() {
            // Create container styles
            const style = document.createElement('style');
            style.textContent = `
                .mm-player-container {
                    width: ${this.options.width};
                    height: ${this.options.height};
                    border-radius: 8px;
                    overflow: hidden;
                    background: ${this.options.theme === 'dark' ? '#1a1a1a' : '#ffffff'};
                    color: ${this.options.theme === 'dark' ? '#ffffff' : '#000000'};
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    display: flex;
                    flex-direction: column;
                }
                .mm-player-header {
                    padding: 20px;
                    text-align: center;
                }
                .mm-player-title {
                    margin: 0;
                    font-size: 1.2em;
                    font-weight: bold;
                    color: #e55538;
                }
                .mm-player-subtitle {
                    margin: 5px 0 0;
                    font-size: 0.9em;
                    opacity: 0.8;
                }
                .mm-now-playing-container {
                    padding: 15px;
                    text-align: center;
                    background: ${this.options.theme === 'dark' ? '#2a2a2a' : '#f5f5f5'};
                    margin: 0 10px;
                    border-radius: 4px;
                }
                .mm-now-playing {
                    margin: 0;
                    font-size: 0.9em;
                    line-height: 1.4;
                }
                .mm-controls-container {
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                }
                .mm-player-controls {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 20px;
                }
                .mm-player-button {
                    width: 90px;
                    height: 90px;
                    border-radius: 50%;
                    border: none;
                    background: ${this.options.theme === 'dark' ? '#333' : '#eee'};
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: background 0.3s;
                }
                .mm-player-button:hover {
                    background: ${this.options.theme === 'dark' ? '#444' : '#ddd'};
                }
                .mm-player-button svg {
                    width: 45px;
                    height: 45px;
                    fill: ${this.options.theme === 'dark' ? '#fff' : '#000'};
                }
                .mm-volume-control {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 0 20px;
                }
                .mm-volume-icon {
                    width: 24px;
                    height: 24px;
                    fill: ${this.options.theme === 'dark' ? '#fff' : '#000'};
                }
                .mm-volume-slider {
                    // flex-grow: 1;
                    height: 4px;
                    -webkit-appearance: none;
                    background: ${this.options.theme === 'dark' ? '#444' : '#ddd'};
                    border-radius: 2px;
                    outline: none;
                }
                .mm-volume-slider::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: ${this.options.theme === 'dark' ? '#fff' : '#000'};
                    cursor: pointer;
                }
                .mm-volume-slider::-moz-range-thumb {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: ${this.options.theme === 'dark' ? '#fff' : '#000'};
                    cursor: pointer;
                    border: none;
                }
                .mm-episode-link {
                    padding: 10px 20px;
                    text-align: center;
                }
                .mm-episode-link a {
                    color: ${this.options.theme === 'dark' ? '#cf2e2e' : '#cf2e2e'};
                    text-decoration: none;
                    text-transform: uppercase;
                }
                .mm-episode-link a:hover {
                    text-decoration: underline;
                }
                .mm-loading {
                    opacity: 0.6;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                .mm-loading-spinner {
                    display: none;
                    width: 30px;
                    height: 30px;
                    border: 3px solid ${this.options.theme === 'dark' ? '#333' : '#eee'};
                    border-top: 3px solid ${this.options.theme === 'dark' ? '#fff' : '#000'};
                    border-radius: 50%;
                    position: absolute;
                    animation: spin 1s linear infinite;
                }

                .mm-player-button.mm-loading .mm-play-icon,
                .mm-player-button.mm-loading .mm-pause-icon {
                    display: none;
                }

                .mm-player-button.mm-loading .mm-loading-spinner {
                    display: block;
                    
                }
                    
            `;
            document.head.appendChild(style);

            // Create player HTML
            this.container.innerHTML = `
                <div class="mm-player-container">
                    <div class="mm-player-header">
                                              
                    </div>
                    <div class="mm-now-playing-container">
                        <p class="mm-now-playing">Loading...</p>
                    </div>
                    <div class="mm-controls-container">
                        <div class="mm-player-controls">
                            <button class="mm-player-button" aria-label="Play/Pause">
                                <svg viewBox="0 0 24 24" class="mm-play-icon">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                                <svg viewBox="0 0 24 24" class="mm-pause-icon" style="display: none;">
                                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                                </svg>
                                <div class="mm-loading-spinner"></div>
                            </button>
                        </div>
                        <div class="mm-volume-control">
                            <svg viewBox="0 0 24 24" class="mm-volume-icon">
                                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                            </svg>
                            <input type="range" class="mm-volume-slider" min="0" max="100" value="${config.defaultVolume * 100}" aria-label="Volume">
                        </div>
                    </div>
                    <div class="mm-episode-link"></div>
                </div>
            `;
            
            this.startStreamChecking();
            
            // Load required scripts
            this.loadScript(`${config.baseUrl}/js/howler.js`, () => {
                this.initializePlayer();
            });

            // Set up metadata updates
            if (this.options.stream !== 'onair') {
                this.startMetadataUpdates();
            }

            // Add volume control listener
            const volumeSlider = this.container.querySelector('.mm-volume-slider');
            volumeSlider.addEventListener('input', (e) => {
                this.updateVolume(e.target.value / 100);
            });
        }

        loadScript(url, callback) {
            const script = document.createElement('script');
            script.src = url;
            script.onload = callback;
            document.head.appendChild(script);
        }

                startStreamChecking() {
            // Check every minute for stream changes
            this.streamCheckInterval = setInterval(() => {
                if (this.options.stream === 'onair') {
                    this.checkAndUpdateStream();
                }
            }, 60000);
        }

        checkAndUpdateStream() {
            const currentStreamUrl = streams[this.options.stream].getStreamUrl();
            
            if (this.lastStreamUrl !== currentStreamUrl) {
                console.log('Stream change detected');
                this.lastStreamUrl = currentStreamUrl;
                this.streamSwitchStartTime = Date.now();
                
                if (this.isPlaying) {
                    this.retryCount = 0;
                    this.switchStream(currentStreamUrl);
                }
            }
        }

        switchStream(newStreamUrl) {
            this.isLoading = true;
            const button = this.container.querySelector('.mm-player-button');
            button.classList.add('mm-loading');

            // Create new Howl instance with new stream
            const newSound = new Howl({
                src: [`${config.baseUrl}${newStreamUrl}`],
                html5: true,
                volume: this.volume,
                format: ['mp3'],
                onplay: () => {
                    if (this.sound) {
                        this.sound.unload();
                    }
                    this.sound = newSound;
                    this.updatePlayerState(true);
                },
                onloaderror: () => this.handleStreamSwitchError(),
                onplayerror: () => this.handleStreamSwitchError()
            });

            newSound.play();
        }

        handleStreamSwitchError() {
            const timeSinceSwitch = Date.now() - this.streamSwitchStartTime;
            
            if (timeSinceSwitch < config.streamSwitchBuffer && this.retryCount < config.retryAttempts) {
                this.retryCount++;
                console.log(`Stream switch retry ${this.retryCount}/${config.retryAttempts}`);
                
                setTimeout(() => {
                    const currentStreamUrl = streams[this.options.stream].getStreamUrl();
                    this.switchStream(currentStreamUrl);
                }, config.retryDelay);
            } else {
                this.handleStreamEnd('Stream switch failed');
            }
        }

        initializePlayer() {
            // For 'onair' stream, use getStreamUrl(), for others use static stream property
            const streamUrl = `${config.baseUrl}${
                this.options.stream === 'onair' 
                    ? streams[this.options.stream].getStreamUrl()
                    : streams[this.options.stream].stream
            }`;
            
            // Only set lastStreamUrl for 'onair' stream
            if (this.options.stream === 'onair') {
                this.lastStreamUrl = streams[this.options.stream].getStreamUrl();
            }

            // Set initial title for onair stream
            if (this.options.stream === 'onair') {
                const nowPlaying = this.container.querySelector('.mm-now-playing');
                nowPlaying.textContent = 'Live Broadcast';
            }

            this.sound = new Howl({
                src: [streamUrl],
                html5: true,
                volume: this.volume,
                format: ['mp3'],
                onplay: () => this.updatePlayerState(true),
                onpause: () => this.updatePlayerState(false),
                onstop: () => {
                    this.updatePlayerState(false);
                    this.handleStreamEnd('Stream stopped');
                },
                onend: () => {
                    console.log('Stream ended, attempting restart');
                    this.handleStreamEnd('Stream ended');
                },
                onloaderror: () => this.handleStreamEnd('Load error'),
                onplayerror: () => this.handleStreamEnd('Play error')
            });

            // Add click handler
            const button = this.container.querySelector('.mm-player-button');
            button.addEventListener('click', () => this.togglePlay());
        }

        togglePlay() {
            if (this.isLoading) return;
            const button = this.container.querySelector('.mm-player-button');

            if (this.isPlaying) {
                this.sound.pause();
            } else {
                this.retryCount = 0;
                this.isLoading = true;
                button.classList.add('mm-loading');
                this.sound.play();
            }
        }

        updatePlayerState(playing) {
            this.isPlaying = playing;
            this.isLoading = false;
            
            const playIcon = this.container.querySelector('.mm-play-icon');
            const pauseIcon = this.container.querySelector('.mm-pause-icon');
            const button = this.container.querySelector('.mm-player-button');
            button.classList.remove('mm-loading');
            
            if (playing) {
                playIcon.style.display = 'none';
                pauseIcon.style.display = 'block';
                // button.classList.remove('mm-loading');
            } else {
                playIcon.style.display = 'block';
                pauseIcon.style.display = 'none';
                // button.classList.remove('mm-loading');
            }
        }

        handleStreamEnd(reason) {
            console.log(`Stream interrupted: ${reason}`);
            
            if (this.retryCount < config.retryAttempts) {
                this.retryCount++;
                this.isLoading = true;
                const button = this.container.querySelector('.mm-player-button');
                button.classList.add('mm-loading');
                
                console.log(`Attempting restart ${this.retryCount}/${config.retryAttempts}`);
                
                setTimeout(() => {
                    if (this.sound) {
                        this.sound.unload();
                    }
                    this.initializePlayer();
                    this.sound.play();
                }, config.retryDelay);
            } else {
                console.log('Max retry attempts reached');
                this.isPlaying = false;
                this.isLoading = false;
                this.updatePlayerState(false);
                this.retryCount = 0;
                
                // Update display and disable button for stream errors
                const nowPlaying = this.container.querySelector('.mm-now-playing');
                const playButton = this.container.querySelector('.mm-player-button');
                
                nowPlaying.textContent = 'Off Air';
                playButton.disabled = true;
                playButton.style.opacity = '0.5';
                playButton.style.cursor = 'not-allowed';
            }
        }

        updateVolume(value) {
            this.volume = value;
            if (this.sound) {
                this.sound.volume(this.volume);
            }
        }

        async updateMetadata() {

            // Skip metadata updates for onair stream
            if (this.options.stream === 'onair') {
                return;
            }

            try {
                // Update title
                const titleResponse = await fetch(`${config.baseUrl}/${this.options.stream}_title`);
                if (titleResponse.ok) {
                    const title = await titleResponse.text();
                    const nowPlaying = this.container.querySelector('.mm-now-playing');
                    nowPlaying.textContent = title.trim() || 'No title available';
                }

                // Update episode link
                const metadataResponse = await fetch(`${config.baseUrl}/${this.options.stream}_metadata`);
                if (metadataResponse.ok) {
                    const metadata = await metadataResponse.json();
                    const linkContainer = this.container.querySelector('.mm-episode-link');
                    
                    if (metadata && metadata.format && metadata.format.filename) {
                        const episodeLink = this.createEpisodeLink(metadata.format.filename);
                        if (episodeLink) {
                            linkContainer.innerHTML = `<a href="${episodeLink}" target="_blank">View Episode Details</a>`;
                        } else {
                            linkContainer.innerHTML = '';
                        }
                    }
                }
            } catch (error) {
                console.error('Metadata update failed:', error);
            }
        }

        createEpisodeLink(filename) {
            const defaultFormat = /(\d{8})_(.+)\.mp3$/;
            const oldPutvFormat = /(\d{8})_PumpUpThaVolume(\d{3})\.mp3$/;
            const mixlrFormat = /(\d{8})_MixlrMusic\.mp3$/;

            const oldPutvMatch = filename.match(oldPutvFormat);
            if (oldPutvMatch) {
                const [, , episodeNumber] = oldPutvMatch;
                return `https://mediamonarchy.com/putv${episodeNumber}/`;
            }

            const mixlrMatch = filename.match(mixlrFormat);
            if (mixlrMatch) {
                const [, date] = mixlrMatch;
                return `https://mediamonarchy.com/${date}mixlrmusic/`;
            }

            const defaultMatch = filename.match(defaultFormat);
            if (defaultMatch) {
                const [, date, episodeName] = defaultMatch;
                const linkSlug = episodeName.toLowerCase().replace(/_/g, '');
                return `https://mediamonarchy.com/${date}${linkSlug}/`;
            }

            return null;
        }

        startMetadataUpdates() {
            // Initial update
            this.updateMetadata();
            
            // Clear any existing interval
            if (this.metadataInterval) {
                clearInterval(this.metadataInterval);
            }
            
            // Set up regular updates
            this.metadataInterval = setInterval(() => {
                this.updateMetadata();
            }, config.metadataRefreshInterval);
        }

        // Cleanup method to prevent memory leaks
        destroy() {
            if (this.metadataInterval) {
                clearInterval(this.metadataInterval);
            }
            if (this.streamCheckInterval) {
                clearInterval(this.streamCheckInterval);
            }
            if (this.sound) {
                this.sound.unload();
            }
        }
    }

    // Create global namespace
    window.MediaMonarchy = {
        createPlayer: function(elementId, options) {
            const container = document.getElementById(elementId);
            if (container) {
                return new MediaMonarchyPlayer(container, options);
            } else {
                console.error('Container element not found:', elementId);
            }
        }
    };
})();
