'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { loginAction } from '@/server/auth.actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const schema = z.object({
  email: z.string().min(1, 'Email obrigatório').email('Email inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
})

type FormValues = z.infer<typeof schema>

export const LoginForm = () => {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  const onSubmit = handleSubmit(async (data) => {
    const fd = new FormData()
    fd.set('email', data.email)
    fd.set('password', data.password)

    const result = await loginAction(fd)

    if (result?.error) {
      setError('root', { message: result.error })
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="login-form">
      <div className="field-group">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="admin@embras.com.br"
          aria-invalid={!!errors.email}
          {...register('email')}
        />
        {errors.email && (
          <span className="field-error">{errors.email.message}</span>
        )}
      </div>

      <div className="field-group">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          aria-invalid={!!errors.password}
          {...register('password')}
        />
        {errors.password && (
          <span className="field-error">{errors.password.message}</span>
        )}
      </div>

      {errors.root && (
        <p className="form-error" role="alert">
          {errors.root.message}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}
