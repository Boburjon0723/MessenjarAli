const CDN = 'https://saeedtahmtan.github.io/telemoji';

export interface Sticker {
    emoji: string;
    code: string;
    webp: string;
    lottie: string;
}

export interface StickerCategory {
    id: string;
    label: string;
    icon: string;
    stickers: Sticker[];
}

function s(emoji: string, code: string, variant = 1): Sticker {
    const file = `${code}_${variant}`;
    return {
        emoji,
        code,
        webp: `${CDN}/webp/animated/${file}.webp`,
        lottie: `${CDN}/lottie/animated/${file}.json`,
    };
}

export const STICKER_CATEGORIES: StickerCategory[] = [
    {
        id: 'smileys',
        label: 'Smileys',
        icon: '😀',
        stickers: [
            s('😀', 'U+1F600'), s('😃', 'U+1F603'), s('😄', 'U+1F604'), s('😁', 'U+1F601'),
            s('😆', 'U+1F606'), s('😅', 'U+1F605'), s('🤣', 'U+1F923'), s('😂', 'U+1F602'),
            s('🙂', 'U+1F642'), s('😉', 'U+1F609'), s('😊', 'U+1F60A'), s('😇', 'U+1F607'),
            s('🥰', 'U+1F970'), s('😍', 'U+1F60D'), s('🤩', 'U+1F929'), s('😘', 'U+1F618'),
            s('😗', 'U+1F617'), s('😚', 'U+1F61A'), s('😙', 'U+1F619'), s('🥲', 'U+1F972'),
            s('😋', 'U+1F60B'), s('😛', 'U+1F61B'), s('😜', 'U+1F61C'), s('🤪', 'U+1F92A'),
            s('😝', 'U+1F61D'), s('🤑', 'U+1F911'), s('🤗', 'U+1F917'), s('🤭', 'U+1F92D'),
            s('🤫', 'U+1F92B'), s('🤔', 'U+1F914'), s('🤐', 'U+1F910'), s('🤨', 'U+1F928'),
            s('😐', 'U+1F610'), s('😑', 'U+1F611'), s('😶', 'U+1F636'), s('😏', 'U+1F60F'),
            s('😒', 'U+1F612'), s('🙄', 'U+1F644'), s('😬', 'U+1F62C'), s('🤥', 'U+1F925'),
        ],
    },
    {
        id: 'emotions',
        label: 'Emotions',
        icon: '😢',
        stickers: [
            s('😌', 'U+1F60C'), s('😔', 'U+1F614'), s('😪', 'U+1F62A'), s('🤤', 'U+1F924'),
            s('😴', 'U+1F634'), s('😷', 'U+1F637'), s('🤒', 'U+1F912'), s('🤕', 'U+1F915'),
            s('🤢', 'U+1F922'), s('🤮', 'U+1F92E'), s('🥵', 'U+1F975'), s('🥶', 'U+1F976'),
            s('🥴', 'U+1F974'), s('😵', 'U+1F635'), s('🤯', 'U+1F92F'), s('😎', 'U+1F60E'),
            s('🥳', 'U+1F973'), s('🧐', 'U+1F9D0'), s('😕', 'U+1F615'), s('😟', 'U+1F61F'),
            s('🙁', 'U+2639'), s('😮', 'U+1F62E'), s('😯', 'U+1F62F'), s('😲', 'U+1F632'),
            s('😳', 'U+1F633'), s('🥺', 'U+1F97A'), s('😦', 'U+1F626'), s('😧', 'U+1F627'),
            s('😨', 'U+1F628'), s('😰', 'U+1F630'), s('😥', 'U+1F625'), s('😢', 'U+1F622'),
            s('😭', 'U+1F62D'), s('😱', 'U+1F631'), s('😖', 'U+1F616'), s('😣', 'U+1F623'),
            s('😞', 'U+1F61E'), s('😓', 'U+1F613'), s('😩', 'U+1F629'), s('😫', 'U+1F62B'),
        ],
    },
    {
        id: 'gestures',
        label: 'Gestures',
        icon: '👍',
        stickers: [
            s('👍', 'U+1F44D'), s('👎', 'U+1F44E'), s('👊', 'U+1F44A'), s('✊', 'U+270A'),
            s('🤛', 'U+1F91B'), s('🤜', 'U+1F91C'), s('👏', 'U+1F44F'), s('🙌', 'U+1F64C'),
            s('👐', 'U+1F450'), s('🤲', 'U+1F932'), s('🤝', 'U+1F91D'), s('🙏', 'U+1F64F'),
            s('✌️', 'U+270C'), s('🤞', 'U+1F91E'), s('🤟', 'U+1F91F'), s('🤘', 'U+1F918'),
            s('👌', 'U+1F44C'), s('🤌', 'U+1F90C'), s('🤏', 'U+1F90F'), s('👈', 'U+1F448'),
            s('👉', 'U+1F449'), s('👆', 'U+1F446'), s('👇', 'U+1F447'), s('☝️', 'U+261D'),
            s('✋', 'U+270B'), s('🤚', 'U+1F91A'), s('🖐️', 'U+1F590'), s('🖖', 'U+1F596'),
            s('👋', 'U+1F44B'), s('🤙', 'U+1F919'), s('💪', 'U+1F4AA'), s('🦾', 'U+1F9BE'),
        ],
    },
    {
        id: 'love',
        label: 'Love',
        icon: '❤️',
        stickers: [
            s('❤', 'U+2764'), s('🧡', 'U+1F9E1'), s('💛', 'U+1F49B'), s('💚', 'U+1F49A'),
            s('💙', 'U+1F499'), s('💜', 'U+1F49C'), s('🖤', 'U+1F5A4'), s('🤍', 'U+1F90D'),
            s('🤎', 'U+1F90E'), s('💔', 'U+1F494'), s('💕', 'U+1F495'), s('💞', 'U+1F49E'),
            s('💓', 'U+1F493'), s('💗', 'U+1F497'), s('💖', 'U+1F496'), s('💘', 'U+1F498'),
            s('💝', 'U+1F49D'), s('💟', 'U+1F49F'), s('💋', 'U+1F48B'), s('💌', 'U+1F48C'),
            s('💐', 'U+1F490'), s('🌹', 'U+1F339'), s('🥀', 'U+1F940'), s('💍', 'U+1F48D'),
        ],
    },
    {
        id: 'animals',
        label: 'Animals',
        icon: '🐶',
        stickers: [
            s('🐶', 'U+1F436'), s('🐱', 'U+1F431'), s('🐭', 'U+1F42D'), s('🐹', 'U+1F439'),
            s('🐰', 'U+1F430'), s('🦊', 'U+1F98A'), s('🐻', 'U+1F43B'), s('🐼', 'U+1F43C'),
            s('🐨', 'U+1F428'), s('🐯', 'U+1F42F'), s('🦁', 'U+1F981'), s('🐮', 'U+1F42E'),
            s('🐷', 'U+1F437'), s('🐸', 'U+1F438'), s('🐵', 'U+1F435'), s('🙈', 'U+1F648'),
            s('🙉', 'U+1F649'), s('🙊', 'U+1F64A'), s('🐔', 'U+1F414'), s('🐧', 'U+1F427'),
            s('🐦', 'U+1F426'), s('🦅', 'U+1F985'), s('🦆', 'U+1F986'), s('🦉', 'U+1F989'),
            s('🐺', 'U+1F43A'), s('🐗', 'U+1F417'), s('🐴', 'U+1F434'), s('🦄', 'U+1F984'),
            s('🐝', 'U+1F41D'), s('🐛', 'U+1F41B'), s('🦋', 'U+1F98B'), s('🐌', 'U+1F40C'),
        ],
    },
    {
        id: 'food',
        label: 'Food',
        icon: '🍕',
        stickers: [
            s('🍎', 'U+1F34E'), s('🍊', 'U+1F34A'), s('🍋', 'U+1F34B'), s('🍌', 'U+1F34C'),
            s('🍉', 'U+1F349'), s('🍇', 'U+1F347'), s('🍓', 'U+1F353'), s('🍑', 'U+1F351'),
            s('🍒', 'U+1F352'), s('🥝', 'U+1F95D'), s('🍅', 'U+1F345'), s('🥑', 'U+1F951'),
            s('🍕', 'U+1F355'), s('🍔', 'U+1F354'), s('🍟', 'U+1F35F'), s('🌭', 'U+1F32D'),
            s('🍿', 'U+1F37F'), s('🧁', 'U+1F9C1'), s('🍰', 'U+1F370'), s('🎂', 'U+1F382'),
            s('🍩', 'U+1F369'), s('🍪', 'U+1F36A'), s('🍫', 'U+1F36B'), s('🍬', 'U+1F36C'),
            s('☕', 'U+2615'), s('🍵', 'U+1F375'), s('🧃', 'U+1F9C3'), s('🍺', 'U+1F37A'),
        ],
    },
    {
        id: 'celebration',
        label: 'Celebration',
        icon: '🎉',
        stickers: [
            s('🎉', 'U+1F389'), s('🎊', 'U+1F38A'), s('🎈', 'U+1F388'), s('🎁', 'U+1F381'),
            s('🎄', 'U+1F384'), s('🎃', 'U+1F383'), s('🎆', 'U+1F386'), s('🎇', 'U+1F387'),
            s('✨', 'U+2728'), s('🎗️', 'U+1F397'), s('🏆', 'U+1F3C6'), s('🥇', 'U+1F947'),
            s('🥈', 'U+1F948'), s('🥉', 'U+1F949'), s('⚽', 'U+26BD'), s('🏀', 'U+1F3C0'),
            s('🎯', 'U+1F3AF'), s('🎮', 'U+1F3AE'), s('🎲', 'U+1F3B2'), s('🎵', 'U+1F3B5'),
            s('🎶', 'U+1F3B6'), s('🎤', 'U+1F3A4'), s('🎸', 'U+1F3B8'), s('🎹', 'U+1F3B9'),
        ],
    },
    {
        id: 'objects',
        label: 'Objects',
        icon: '💡',
        stickers: [
            s('💡', 'U+1F4A1'), s('🔥', 'U+1F525'), s('💯', 'U+1F4AF'), s('💥', 'U+1F4A5'),
            s('💫', 'U+1F4AB'), s('💦', 'U+1F4A6'), s('💨', 'U+1F4A8'), s('💣', 'U+1F4A3'),
            s('💬', 'U+1F4AC'), s('👀', 'U+1F440'), s('🧠', 'U+1F9E0'), s('💀', 'U+1F480'),
            s('👻', 'U+1F47B'), s('👽', 'U+1F47D'), s('🤖', 'U+1F916'), s('🎭', 'U+1F3AD'),
            s('🌈', 'U+1F308'), s('⭐', 'U+2B50'), s('🌟', 'U+1F31F'), s('💤', 'U+1F4A4'),
            s('🔔', 'U+1F514'), s('🎵', 'U+1F3B5'), s('📌', 'U+1F4CC'), s('🔑', 'U+1F511'),
        ],
    },
];

export const ALL_STICKERS = STICKER_CATEGORIES.flatMap(c => c.stickers);
