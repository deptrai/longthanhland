import { useState, useCallback, useEffect } from 'react';

export interface ReferralStats {
    totalReferrals: number;
    convertedReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
}

export interface ReferralCode {
    code: string;
    url: string;
}

export const useReferral = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
    const [stats, setStats] = useState<ReferralStats | null>(null);

    const fetchReferralCode = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/referral/code');

            if (!response.ok) {
                throw new Error('Failed to fetch referral code');
            }

            const data = await response.json();
            setReferralCode(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load referral code');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/referral/stats');

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();
            setStats(data);
        } catch (err: any) {
            setError(err.message || 'Failed to load stats');
        }
    }, []);

    const copyLink = useCallback(async () => {
        if (!referralCode) return false;

        try {
            await navigator.clipboard.writeText(referralCode.url);
            return true;
        } catch {
            setError('Failed to copy link');
            return false;
        }
    }, [referralCode]);

    const shareLink = useCallback(async () => {
        if (!referralCode) return;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Trồng cây cùng Đại Ngàn Xanh',
                    text: 'Cùng tôi trồng cây Dó Đen cho Mẹ Thiên Nhiên! 🌳',
                    url: referralCode.url,
                });
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    setError('Share failed');
                }
            }
        } else {
            // Fallback to Facebook share
            const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralCode.url)}`;
            window.open(fbUrl, '_blank', 'width=600,height=400');
        }
    }, [referralCode]);

    useEffect(() => {
        fetchReferralCode();
        fetchStats();
    }, [fetchReferralCode, fetchStats]);

    return {
        referralCode,
        stats,
        loading,
        error,
        copyLink,
        shareLink,
        refreshStats: fetchStats,
    };
};
