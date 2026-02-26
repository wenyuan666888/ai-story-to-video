import { RegisterForm } from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-2">注册</h1>
        <p className="text-gray-500 text-sm mb-6">创建账号后即可使用故事转视频功能</p>
        <RegisterForm />
      </div>
    </div>
  );
}
