import { useState, useCallback } from 'react';

export interface ShareCardData {
    userName: string;
    treeCount: number;
    co2Absorbed: number;
    shareText: string;
    shareUrl: string;
    svgUrl: string;
}

export const useShareCard = (
    userName: string,
    treeCount: number,
    co2Absorbed: number,
    referralCode?: string,
) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [shareData, setShareData] = useState<ShareCardData | null>(null);

    const fetchShareData = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                name: userName,
                trees: String(treeCount),
                co2: String(co2Absorbed),
            });

            if (referralCode) {
                params.append('ref', referralCode);
            }

            const response = await fetch(`/share-card/data?${params.toString()}`);

            if (!response.ok) {
                throw new Error('Failed to fetch share data');
            }

            const data = await response.json();
            setShareData(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load share card');
        } finally {
            setLoading(false);
        }
    }, [userName, treeCount, co2Absorbed, referralCode]);

    const handleWebShare = useCallback(async () => {
        if (!shareData) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Đại Ngàn Xanh',
                    text: shareData.shareText,
                    url: shareData.shareUrl,
                });
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    setError('Share failed');
                }
            }
        } else {
            // Fallback to Facebook share
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareData.shareUrl)}`;
            window.open(fbUrl, '_blank', 'width=600,height=400');
        }
    }, [shareData]);

    const handleCopyLink = useCallback(async () => {
        if (!shareData) return;

        try {
            await navigator.clipboard.writeText(shareData.shareUrl);
            return true;
        } catch {
            setError('Failed to copy link');
            return false;
        }
    }, [shareData]);

    const handleDownloadSvg = useCallback(async () => {
        if (!shareData) return;

        try {
            const response = await fetch(shareData.svgUrl);
            const svgBlob = await response.blob();
            const url = URL.createObjectURL(svgBlob);

            const link = document.createElement('a');
            link.href = url;
            link.download = `dainganxanh-share-${Date.now()}.svg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch {
            setError('Failed to download');
        }
    }, [shareData]);

    return {
        shareData,
        loading,
        error,
        fetchShareData,
        handleWebShare,
        handleCopyLink,
        handleDownloadSvg,
    };
};
