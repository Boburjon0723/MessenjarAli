export interface User {
    id: string;
    name: string;
    surname: string;
    username?: string;
    phone?: string;
    email?: string;
    role: string;
    is_active: boolean;
    phone_verified?: boolean;
    avatar_url?: string;
    wallet?: {
        balance: string;
    };
}

export interface TopUp {
    id: string;
    amount: string;
    name: string;
    phone?: string;
    email?: string;
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
}

export interface Transaction {
    id: string;
    created_at: string;
    type: string;
    sender_name?: string;
    receiver_name: string;
    amount: string;
    status: string;
}

export interface JobCategory {
    id: string;
    name_uz: string;
    name_ru: string;
    icon: string;
    publication_price_mali: string;
}

export interface AdminLoginAudit {
    id: string;
    user_id: string | null;
    phone_or_email: string;
    ip_address?: string | null;
    user_agent?: string | null;
    success: boolean;
    reason?: string | null;
    created_at: string;
    name?: string;
    surname?: string;
    email?: string;
    phone?: string;
    role?: string;
}

export interface Expert {
    id: string;

    name: string;
    surname: string;
    username: string;
    profession: string;
    bio_expert?: string;
    avatar_url?: string;
    hourly_rate: string;
    currency: string;
    experience_years: string;
    institution?: string;
    specialization_details?: string;
    service_languages?: string;
    service_format?: string;
    has_diploma: boolean;
    diploma_url?: string;
    id_url?: string;
    selfie_url?: string;
    certificate_url?: string;
    resume_url?: string;
    anketa_url?: string;
    verified_status: 'pending' | 'approved' | 'rejected';
}

export interface DisputedDeal {
    id: string;
    chat_id: string;
    amount: string;
    status: string;
    client_id: string;
    client_name: string;
    expert_id: string;
    expert_name: string;
    created_at: string;
    updated_at: string;
}
