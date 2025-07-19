export class AnkiService {
    private static instance: AnkiService;

    private constructor() {
        // Private constructor to enforce singleton pattern
    }

    public static getInstance(): AnkiService {
        if (!AnkiService.instance) {
            AnkiService.instance = new AnkiService();
        }
        return AnkiService.instance;
    }

    public async sendAudioToAnki(audioBlob: Blob): Promise<void> {
        const filename = await this.storeAudioFile(audioBlob);
        await this.updateLastAnkiCard({
            fields: { 'SentenceAudio': `[sound:${filename}]` }
        });
    }

    public async sendScreenshotToAnki(screenshotBlob: Blob): Promise<void> {
        const filename = await this.storeImageFile(screenshotBlob);
        await this.updateLastAnkiCard({
            fields: { 'Picture': `<img src="${filename}">` }
        });
    }

    public async updateLastAnkiCard(data: {
        fields: Record<string, string>
    }): Promise<void> {
        try {
            const lastCardId = await this.getLastCardId();
            if (!lastCardId) {
                throw new Error('No cards found to update');
            }

            const note = await this.getNote(lastCardId);
            if (!note) {
                throw new Error('Could not retrieve note for last card');
            }

            const updatedFields = {};

            if (data.fields) {
                Object.assign(updatedFields, data.fields);
            }

            await this.updateNote(lastCardId, updatedFields);
        } catch (error) {
            console.error('Failed to update last Anki card:', error);
            throw error;
        }
    }

    private async getLastCardId(): Promise<number | null> {
        const response = await this.ankiConnect({
            action: 'findCards',
            params: {
                query: 'added:1'
            }
        });

        const cardIds = response.result;
        return cardIds && cardIds.length > 0 ? cardIds[cardIds.length - 1] : null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async getNote(cardId: number): Promise<any> {
        const cardInfo = await this.ankiConnect({
            action: 'cardsInfo',
            params: {
                cards: [cardId]
            }
        });

        if (cardInfo.result && cardInfo.result.length > 0) {
            const noteId = cardInfo.result[0].note;
            const noteInfo = await this.ankiConnect({
                action: 'notesInfo',
                params: {
                    notes: [noteId]
                }
            });
            return noteInfo.result && noteInfo.result.length > 0 ? noteInfo.result[0] : null;
        }
        return null;
    }

    private async updateNote(cardId: number, fields: Record<string, string>): Promise<void> {
        const cardInfo = await this.ankiConnect({
            action: 'cardsInfo',
            params: {
                cards: [cardId]
            }
        });

        if (cardInfo.result && cardInfo.result.length > 0) {
            const noteId = cardInfo.result[0].note;
            await this.ankiConnect({
                action: 'updateNoteFields',
                params: {
                    note: {
                        id: noteId,
                        fields: fields
                    }
                }
            });
        }
    }

    private async storeAudioFile(audioBlob: Blob): Promise<string> {
        const arrayBuffer = await audioBlob.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        if (audioBlob.type !== 'audio/mpeg') {
            throw new Error('Unsupported audio format. Only MP3 is supported.');
        }
        const extension = 'mp3';
        const filename = `audio_${Date.now()}.${extension}`;

        await this.ankiConnect({
            action: 'storeMediaFile',
            params: {
                filename: filename,
                data: base64Audio
            }
        });

        return filename;
    }

    private async storeImageFile(imageBlob: Blob): Promise<string> {
        const arrayBuffer = await imageBlob.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
        if (imageBlob.type !== 'image/png' && imageBlob.type !== 'image/jpeg') {
            throw new Error('Unsupported image format. Only PNG and JPEG are supported.');
        }
        const extension = imageBlob.type.includes('png') ? 'png' : 'jpg';
        const filename = `screenshot_${Date.now()}.${extension}`;

        await this.ankiConnect({
            action: 'storeMediaFile',
            params: {
                filename: filename,
                data: base64Image
            }
        });

        return filename;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async ankiConnect(params: any): Promise<any> {
        const response = await fetch('http://127.0.0.1:8765', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                version: 6,
                ...params
            })
        });

        if (!response.ok) {
            throw new Error(`AnkiConnect request failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (result.error) {
            throw new Error(`AnkiConnect error: ${result.error}`);
        }

        return result;
    }
}
