import React from 'react';

const AudioPlayer = () => {
    const audioSource = 'meeting.mp3';

    return (
        <div style={{ backgroundColor: '#2B2B2B', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center'}}>
            <div style={{ marginBottom: '20px', fontSize: '24px', color: 'white' }}>
                This is recorded in New York <br />
                (N.Y. Penal Law &sect;&sect; 250.00, 250.05)
            </div>
            <audio controls>
                <source src={audioSource} type="audio/mp3" />
                Your browser does not support the audio element.
            </audio>
        </div>
    );
}

export default AudioPlayer;
