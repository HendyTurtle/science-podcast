
// 获取DOM元素
const audioPlayer = document.getElementById('audio-player');
const playPauseBtn = document.getElementById('play-pause');
const playPauseIcon = playPauseBtn.querySelector('i');
const progressBar = document.querySelector('.progress-bar');
const progressFill = document.querySelector('.progress-fill');
const currentTimeEl = document.getElementById('current-time');
const totalTimeEl = document.getElementById('total-time');
const volumeBtn = document.getElementById('volume-btn');
const volumeIcon = volumeBtn.querySelector('i');
const volumeBar = document.querySelector('.volume-bar');
const volumeFill = document.querySelector('.volume-fill');
const rewindBtn = document.getElementById('rewind');
const forwardBtn = document.getElementById('forward');
const settingsBtn = document.getElementById('settings-btn');
const settingsPanel = document.querySelector('.settings-panel');
const closeSettingsBtn = document.querySelector('.close-settings');
const bassControl = document.getElementById('bass');
const midControl = document.getElementById('mid');
const trebleControl = document.getElementById('treble');
const speedButtons = document.querySelectorAll('.speed-buttons button');
const visualizer = document.getElementById('visualizer');
// 获取遮罩元素
const restOverlay = document.querySelector('.rest-overlay');

// 定义休息时间段（以秒为单位）
const restStartTime = 178; // 例如，从第60秒开始休息
const restEndTime = 220;  // 例如，到第120秒结束休息


// 音频上下文和分析器
let audioContext;
let analyser;
let source;
let dataArray;
let canvasCtx = visualizer.getContext('2d');
let animationId;
let isVisualizerInitialized = false;

// 均衡器节点
let bassFilter;
let midFilter;
let trebleFilter;

// 初始化音频播放器
function initAudioPlayer() {
    // 设置音量
    audioPlayer.volume = 0.8;
    updateVolumeUI();
    
    // 加载音频元数据
    audioPlayer.addEventListener('loadedmetadata', updateDuration);
    
    // 添加canplay事件监听，确保音频准备好后再次更新时长
    audioPlayer.addEventListener('canplay', updateDuration);
    
    // 播放时更新进度
    audioPlayer.addEventListener('timeupdate', updateProgress);
    
    // 音频结束时重置
    audioPlayer.addEventListener('ended', () => {
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
        progressFill.style.width = '0%';
        currentTimeEl.textContent = formatTime(0);
        audioPlayer.currentTime = 0;
    });
    
    // 初始化事件监听器
    initEventListeners();
    setTimeout(() => setAudioEffect('default'), 100);
}

// 新增函数：更新音频时长显示
function updateDuration() {
    if (audioPlayer.duration && !isNaN(audioPlayer.duration)) {
        const adjustedDuration = audioPlayer.duration - (restEndTime - restStartTime);
        totalTimeEl.textContent = formatTime(adjustedDuration);
        currentTimeEl.textContent = formatTime(0);
    }
}

// 初始化事件监听器
function initEventListeners() {
    // 播放/暂停按钮
    playPauseBtn.addEventListener('click', togglePlayPause);
    
    // 进度条控制
    progressBar.addEventListener('click', setProgress);
    
    // 音量控制
    volumeBar.addEventListener('click', setVolume);
    volumeBtn.addEventListener('click', toggleMute);
    
    // 快进快退
    rewindBtn.addEventListener('click', () => skipTime(-10));
    forwardBtn.addEventListener('click', () => skipTime(10));
    
    // 设置面板
    settingsBtn.addEventListener('click', toggleSettings);
    if (closeSettingsBtn) {
        closeSettingsBtn.addEventListener('click', () => {
            settingsPanel.classList.remove('active');
            settingsPanel.classList.add('hidden');
        });
    }
    
    // 播放速度控制
    speedButtons.forEach(button => {
        button.addEventListener('click', () => {
            const speed = parseFloat(button.getAttribute('data-speed'));
            setPlaybackSpeed(speed);
            
            // 更新活跃按钮
            speedButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
    const effectButtons = document.querySelectorAll('.effect-buttons button');
    let currentEffect = 'default';
    bassControl.addEventListener('input', updateEqualizer);
    midControl.addEventListener('input', updateEqualizer);
    trebleControl.addEventListener('input', updateEqualizer);
    
    effectButtons.forEach(button => {
        button.addEventListener('click', () => {
            const effect = button.getAttribute('data-effect');
            setAudioEffect(effect);
            effectButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
        });
    });
}

// 播放/暂停切换
function togglePlayPause() {
    if (audioPlayer.paused) {
        audioPlayer.play();
        playPauseIcon.classList.remove('fa-play');
        playPauseIcon.classList.add('fa-pause');
        
        // 初始化可视化效果（如果尚未初始化）
        if (!isVisualizerInitialized) {
            initVisualizer();
        }
    } else {
        audioPlayer.pause();
        playPauseIcon.classList.remove('fa-pause');
        playPauseIcon.classList.add('fa-play');
    }
}

// Update progress bar
function updateProgress() {
    const currentTime = audioPlayer.currentTime;
    const duration = audioPlayer.duration || 1;
    let displayTime;
    let progressPercent;

    // Calculate display time and progress based on rest period
    if (currentTime < restStartTime) {
        // Before rest period - show normal time
        displayTime = currentTime;
        progressPercent = (currentTime / duration) * 100;
    } else if (currentTime >= restStartTime && currentTime <= restEndTime) {
        // During rest period - show 0
        displayTime = restStartTime;
        restOverlay.classList.remove('hidden');
        progressFill.style.display = 'none';
    } else {
        // After rest period - subtract rest duration
        const restDuration = restEndTime - restStartTime;
        displayTime = currentTime - restDuration;
        progressPercent = (currentTime / duration) * 100;
    }

    // Update UI
    if (currentTime < restStartTime || currentTime > restEndTime) {
        restOverlay.classList.add('hidden');
        progressFill.style.display = 'block';
        progressFill.style.width = `${progressPercent}%`;
    }
    
    currentTimeEl.textContent = formatTime(displayTime);
}

// 设置进度
function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = audioPlayer.duration;
    
    audioPlayer.currentTime = (clickX / width) * duration;
}

// 设置音量
function setVolume(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const volume = clickX / width;
    
    audioPlayer.volume = volume;
    updateVolumeUI();
}

// 更新音量UI
function updateVolumeUI() {
    volumeFill.style.width = `${audioPlayer.volume * 100}%`;
    
    // 更新音量图标
    volumeIcon.className = '';
    if (audioPlayer.volume === 0) {
        volumeIcon.classList.add('fas', 'fa-volume-mute');
    } else if (audioPlayer.volume < 0.5) {
        volumeIcon.classList.add('fas', 'fa-volume-down');
    } else {
        volumeIcon.classList.add('fas', 'fa-volume-up');
    }
}

// 切换静音
function toggleMute() {
    if (audioPlayer.volume > 0) {
        audioPlayer.dataset.prevVolume = audioPlayer.volume;
        audioPlayer.volume = 0;
    } else {
        audioPlayer.volume = audioPlayer.dataset.prevVolume || 1;
    }
    
    updateVolumeUI();
}

// 快进/快退
function skipTime(seconds) {
    audioPlayer.currentTime += seconds;
}

// 切换设置面板
function toggleSettings() {
    settingsPanel.classList.toggle('active');
    settingsPanel.classList.toggle('hidden');
}

// 设置播放速度
function setPlaybackSpeed(speed) {
    audioPlayer.playbackRate = speed;
}

// 初始化可视化效果
function initVisualizer() {
    // 创建音频上下文
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    
    // 连接音频源
    source = audioContext.createMediaElementSource(audioPlayer);
    
    // 创建均衡器滤波器
    bassFilter = audioContext.createBiquadFilter();
    bassFilter.type = 'lowshelf';
    bassFilter.frequency.value = 200;
    
    midFilter = audioContext.createBiquadFilter();
    midFilter.type = 'peaking';
    midFilter.frequency.value = 1000;
    midFilter.Q.value = 1;
    
    trebleFilter = audioContext.createBiquadFilter();
    trebleFilter.type = 'highshelf';
    trebleFilter.frequency.value = 3000;
    
    // 连接节点
    source.connect(bassFilter);
    bassFilter.connect(midFilter);
    midFilter.connect(trebleFilter);
    trebleFilter.connect(analyser);
    analyser.connect(audioContext.destination);
    
    // 设置分析器
    analyser.fftSize = 256;
    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
    
    // 设置画布大小
    visualizer.width = visualizer.clientWidth * window.devicePixelRatio;
    visualizer.height = visualizer.clientHeight * window.devicePixelRatio;
    canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    
    // 开始绘制
    drawVisualizer();
    
    isVisualizerInitialized = true;
}

// 绘制可视化效果
function drawVisualizer() {
    animationId = requestAnimationFrame(drawVisualizer);
    
    // 获取频率数据
    analyser.getByteFrequencyData(dataArray);
    
    // 清除画布
    canvasCtx.clearRect(0, 0, visualizer.clientWidth, visualizer.clientHeight);
    
    // 设置绘制样式
    const barWidth = (visualizer.clientWidth / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;
    
    // 绘制频谱
    for (let i = 0; i < dataArray.length; i++) {
        barHeight = (dataArray[i] / 255) * visualizer.clientHeight * 0.8;
        
        // 创建渐变
        const gradient = canvasCtx.createLinearGradient(0, 0, 0, visualizer.clientHeight);
        gradient.addColorStop(0, '#e6a919');
        gradient.addColorStop(1, '#ff6b6b');
        
        canvasCtx.fillStyle = gradient;
        canvasCtx.fillRect(x, visualizer.clientHeight - barHeight, barWidth, barHeight);
        
        x += barWidth + 1;
    }
    
    // 如果音频暂停，停止动画
    if (audioPlayer.paused) {
        cancelAnimationFrame(animationId);
    }
}

// 更新均衡器
function updateEqualizer() {
    if (!isVisualizerInitialized) return;
    
    bassFilter.gain.value = parseFloat(bassControl.value);
    midFilter.gain.value = parseFloat(midControl.value);
    trebleFilter.gain.value = parseFloat(trebleControl.value);
}

// 格式化时间（秒 -> MM:SS）
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
}

// 窗口大小改变时调整画布大小
window.addEventListener('resize', () => {
    if (isVisualizerInitialized) {
        visualizer.width = visualizer.clientWidth * window.devicePixelRatio;
        visualizer.height = visualizer.clientHeight * window.devicePixelRatio;
        canvasCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
});

// 初始化播放器
document.addEventListener('DOMContentLoaded', initAudioPlayer);

// 新增音效模式切换函数
function setAudioEffect(effect) {
    if (!audioContext) {
        initVisualizer();
    }
    if (!bassFilter || !midFilter || !trebleFilter) return;
    switch(effect) {
        case 'default':
            bassFilter.gain.value = 0;
            midFilter.gain.value = 0;
            trebleFilter.gain.value = 0;
            break;
        case 'spatial':
            bassFilter.gain.value = 2;
            midFilter.gain.value = 2;
            trebleFilter.gain.value = 4;
            break;
        case 'bass':
            bassFilter.gain.value = 8;
            midFilter.gain.value = 0;
            trebleFilter.gain.value = -2;
            break;
        case 'vocal':
            bassFilter.gain.value = -2;
            midFilter.gain.value = 6;
            trebleFilter.gain.value = 4;
            break;
        default:
            bassFilter.gain.value = 0;
            midFilter.gain.value = 0;
            trebleFilter.gain.value = 0;
    }
    currentEffect = effect;
}