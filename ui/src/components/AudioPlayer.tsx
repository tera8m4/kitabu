import { useEffect, useState } from "react";

export const AudioPlayer = ({ audioBlob }: { audioBlob: Blob }) => {
    const [audioUrl, setAudioUrl] = useState<string | null>(null);

    useEffect(() => {
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
      
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [audioBlob]);

    if (!audioUrl) return null;

    return (
      <div className="audio-player">
        <audio controls>
          <source src={audioUrl} type={audioBlob.type} />
          Your browser does not support the audio element.
        </audio>
      </div>
    );
};
