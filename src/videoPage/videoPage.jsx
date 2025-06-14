import React from 'react';
import './videoPage.css';

const VideoPage = () => {
    return (
            <div className="video-page">
                <div className="animated-background"></div>
                <div className="video-container">
                    <video
                            className="transparent-video"
                            autoPlay
                            loop
                            muted
                            playsInline
                    >
                        <source src="/video.webm" type="video/webm" />
                        <source src="/video.mov" type="video/mp4" />
                        Ваш браузер не поддерживает видео HTML5.
                    </video>
                </div>
            </div>
    );
};

export default VideoPage;