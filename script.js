class LipSyncAnimator {
    constructor() {
        this.audio = document.getElementById('audio-player');
        this.mouthPath = document.getElementById('mouth-path');
        this.subtitleDisplay = document.getElementById('current-subtitle');
        this.currentVisemeDisplay = document.getElementById('current-viseme');
        this.debugTimeDisplay = document.getElementById('debug-time');
        this.timeDisplay = document.getElementById('time-display');
        
        this.srtData = [];
        this.currentSubtitleIndex = -1;
        this.animationFrame = null;
        this.isPlaying = false;
        
        this.initializeControls();
        this.initializeVisemes();
    }
    
    initializeVisemes() {
        // Define mouth shapes for different phonemes/visemes
        this.visemes = {
            'rest': 'M 80 90 Q 100 95 120 90',
            'a': 'M 75 85 Q 100 105 125 85 Q 100 100 75 85',
            'e': 'M 80 88 Q 100 98 120 88 Q 100 95 80 88',
            'i': 'M 85 90 Q 100 92 115 90',
            'o': 'M 78 87 Q 100 105 122 87 Q 100 105 78 87',
            'u': 'M 85 88 Q 100 95 115 88 Q 100 92 85 88',
            'consonant': 'M 82 90 Q 100 93 118 90',
            'f': 'M 80 88 Q 100 95 120 88',
            'm': 'M 85 90 L 115 90',
            'wide': 'M 70 90 Q 100 98 130 90 Q 100 95 70 90'
        };
    }
    
    initializeControls() {
        // File upload handlers
        document.getElementById('srt-upload').addEventListener('change', (e) => {
            this.loadSRTFile(e.target.files[0]);
        });
        
        document.getElementById('audio-upload').addEventListener('change', (e) => {
            this.loadAudioFile(e.target.files[0]);
        });
        
        // Playback controls
        document.getElementById('play-btn').addEventListener('click', () => this.play());
        document.getElementById('pause-btn').addEventListener('click', () => this.pause());
        document.getElementById('stop-btn').addEventListener('click', () => this.stop());
        
        // Audio events
        this.audio.addEventListener('loadedmetadata', () => this.updateTimeDisplay());
        this.audio.addEventListener('timeupdate', () => this.updateAnimation());
        this.audio.addEventListener('ended', () => this.stop());
    }
    
    async loadSRTFile(file) {
        if (!file) return;
        
        const text = await file.text();
        this.srtData = this.parseSRT(text);
        console.log('Loaded SRT data:', this.srtData);
    }
    
    parseSRT(srtContent) {
        const subtitles = [];
        const blocks = srtContent.trim().split('\n\n');
        
        blocks.forEach(block => {
            const lines = block.split('\n');
            if (lines.length >= 3) {
                const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (timeMatch) {
                    const startTime = this.timeToSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]);
                    const endTime = this.timeToSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]);
                    const text = lines.slice(2).join(' ').replace(/<[^>]*>/g, '');
                    
                    subtitles.push({
                        start: startTime,
                        end: endTime,
                        text: text
                    });
                }
            }
        });
        
        return subtitles;
    }
    
    timeToSeconds(hours, minutes, seconds, milliseconds) {
        return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(milliseconds) / 1000;
    }
    
    loadAudioFile(file) {
        if (!file) return;
        
        const url = URL.createObjectURL(file);
        this.audio.src = url;
        this.audio.load();
    }
    
    play() {
        if (this.audio.src && this.srtData.length > 0) {
            this.audio.play();
            this.isPlaying = true;
            this.startAnimation();
        }
    }
    
    pause() {
        this.audio.pause();
        this.isPlaying = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        this.currentSubtitleIndex = -1;
        this.subtitleDisplay.textContent = '';
        this.setMouthShape('rest');
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
    }
    
    startAnimation() {
        const animate = () => {
            if (this.isPlaying) {
                this.updateAnimation();
                this.animationFrame = requestAnimationFrame(animate);
            }
        };
        animate();
    }
    
    updateAnimation() {
        const currentTime = this.audio.currentTime;
        this.debugTimeDisplay.textContent = currentTime.toFixed(2) + 's';
        this.updateTimeDisplay();
        
        // Find current subtitle
        const currentSubtitle = this.srtData.find(sub => 
            currentTime >= sub.start && currentTime <= sub.end
        );
        
        if (currentSubtitle) {
            this.subtitleDisplay.textContent = currentSubtitle.text;
            
            // Determine mouth shape based on text
            const viseme = this.getVisemeFromText(currentSubtitle.text, currentTime - currentSubtitle.start);
            this.setMouthShape(viseme);
            this.currentVisemeDisplay.textContent = viseme;
        } else {
            this.subtitleDisplay.textContent = '';
            this.setMouthShape('rest');
            this.currentVisemeDisplay.textContent = 'rest';
        }
    }
    
    getVisemeFromText(text, relativeTime) {
        // Simple phoneme mapping based on common letter patterns
        const lowerText = text.toLowerCase();
        const timeInText = Math.floor((relativeTime / 2) * text.length); // Rough approximation
        const currentChar = lowerText[Math.min(timeInText, lowerText.length - 1)];
        
        // Map characters to visemes
        if ('aeiou'.includes(currentChar)) {
            switch(currentChar) {
                case 'a': return 'a';
                case 'e': return 'e';
                case 'i': return 'i';
                case 'o': return 'o';
                case 'u': return 'u';
                default: return 'a';
            }
        } else if ('bpmw'.includes(currentChar)) {
            return 'm';
        } else if ('fv'.includes(currentChar)) {
            return 'f';
        } else if (currentChar === ' ') {
            return 'rest';
        } else {
            return 'consonant';
        }
    }
    
    setMouthShape(viseme) {
        const shape = this.visemes[viseme] || this.visemes['rest'];
        this.mouthPath.setAttribute('d', shape);
        
        // Add subtle animation
        this.mouthPath.style.transition = 'all 0.1s ease-out';
    }
    
    updateTimeDisplay() {
        const current = this.formatTime(this.audio.currentTime);
        const duration = this.formatTime(this.audio.duration || 0);
        this.timeDisplay.textContent = `${current} / ${duration}`;
    }
    
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// Initialize the lip sync animator when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new LipSyncAnimator();
});

