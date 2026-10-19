// services/authService.ts — Quản lý xác thực người dùng thật với Supabase Auth
import { supabase } from "./supabaseClient";
import type { User } from "@supabase/supabase-js";

export async function loginWithEmail(email: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    if (error.message.includes("Invalid login credentials")) {
      throw new Error("Email hoặc mật khẩu không chính xác.");
    }
    if (error.message.includes("Email not confirmed")) {
      throw new Error("Email này chưa được xác thực. Hãy kiểm tra hộp thư hoặc bật Auto-confirm trên Supabase.");
    }
    throw new Error(error.message || "Đăng nhập thất bại.");
  }

  if (!data.user) throw new Error("Không tìm thấy thông tin tài khoản.");
  return data.user;
}

export async function registerWithEmail(
  email: string,
  password: string,
  fullName: string
): Promise<{ user: User | null; session: unknown }> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  });

  if (error) {
    if (error.message.includes("User already registered")) {
      throw new Error("Email này đã được đăng ký tài khoản trước đó.");
    }
    if (error.message.includes("Password should be")) {
      throw new Error("Mật khẩu phải có tối thiểu 6 ký tự.");
    }
    throw new Error(error.message || "Đăng ký thất bại.");
  }

  // Tự động ghi nhận hồ sơ vào bảng profiles nếu có
  if (data.user) {
    try {
      await supabase.from("profiles").upsert({
        id: data.user.id,
        full_name: fullName.trim(),
        email: email.trim(),
      });
    } catch {
      // bỏ qua lỗi nếu RLS profile chưa sẵn sàng
    }
  }

  return { user: data.user, session: data.session };
}

export async function logoutUser(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user;
  } catch {
    return null;
  }
}
