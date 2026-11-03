import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { useSite } from '@/context/SiteContext';
import { useSeo } from '@/lib/seo';
import { Button } from '@/components/store/SiteButton';

interface Errors { name?: string; email?: string; message?: string }

export default function Contact() {
  const { config, allProducts } = useSite();
  const [params] = useSearchParams();
  const c = config.contact;
  const page = config.pages.contact;
  useSeo(`${page.title} | ${config.brand.name}`, page.intro);

  const enquiredProduct = allProducts.find((p) => p.slug === params.get('product'));
  const prefill = enquiredProduct
    ? `Hello, I would like to know more about the ${enquiredProduct.name}${params.get('size') ? ` in size ${params.get('size')}` : ''}${params.get('color') ? `, colour ${params.get('color')}` : ''}.`
    : '';

  const [form, setForm] = useState({ name: '', email: '', message: prefill });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'failed'>('idle');

  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const err: Errors = {};
    if (form.name.trim().length < 2) err.name = 'Please enter your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) err.email = 'Please enter a valid email address.';
    if (form.message.trim().length < 10) err.message = 'Please write a message of at least 10 characters.';
    setErrors(err);
    if (Object.keys(err).length) return;

    if (c.formEndpoint) {
      setStatus('sending');
      try {
        const res = await fetch(c.formEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email.trim(),
            message: form.message.trim(),
            product: enquiredProduct?.name ?? '',
            _subject: enquiredProduct ? `Enquiry: ${enquiredProduct.name}` : `Message from ${form.name.trim()}`,
          }),
        });
        if (!res.ok) throw new Error(String(res.status));
        setStatus('done');
        setForm({ name: '', email: '', message: '' });
      } catch {
        setStatus('failed');
      }
      return;
    }
    if (!c.email) return;

    // Static hosting has no mail server: open the visitor's email app with everything filled in
    const subject = enquiredProduct ? `Enquiry: ${enquiredProduct.name}` : `Message from ${form.name.trim()}`;
    const body = `${form.message.trim()}\n\n${form.name.trim()}\n${form.email.trim()}`;
    window.location.href = `mailto:${c.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const field = 'w-full border border-ink/25 bg-transparent px-4 py-3 text-[0.95rem] outline-offset-2 placeholder:opacity-40 focus:border-ink';
  const radius = { borderRadius: 'var(--radius)' };

  return (
    <section className="sm-section">
      <div className="sm-container grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-24">
        <div className="space-y-8">
          <h1 data-edit="pages.contact.title" className="text-[clamp(2.6rem,5.6vw,4.4rem)]">{page.title}</h1>
          <p data-edit="pages.contact.intro" className="max-w-md text-[1.05rem] leading-relaxed opacity-75">{page.intro}</p>
          <ul data-edit="contact.email" className="space-y-5 text-[0.98rem]">
            {c.email && (
              <li className="flex items-start gap-4">
                <Mail size={19} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <a href={`mailto:${c.email}`} className="break-all underline-offset-4 hover:underline">{c.email}</a>
              </li>
            )}
            {c.phone && (
              <li className="flex items-start gap-4">
                <Phone size={19} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="underline-offset-4 hover:underline">{c.phone}</a>
              </li>
            )}
            {c.address && (
              <li className="flex items-start gap-4">
                <MapPin size={19} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span className="whitespace-pre-line">{c.address}</span>
              </li>
            )}
            {c.hours && (
              <li className="flex items-start gap-4">
                <Clock size={19} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                <span>{c.hours}</span>
              </li>
            )}
          </ul>
        </div>

        <form onSubmit={submit} noValidate className="space-y-5" aria-label="Contact form">
          {enquiredProduct && (
            <p className="border-l-2 border-accent bg-surface px-4 py-3 text-sm">
              Enquiry about <strong>{enquiredProduct.name}</strong>
            </p>
          )}
          <div>
            <label htmlFor="c-name" className="mb-2 block text-[0.74rem] uppercase tracking-[0.2em] opacity-70">Name</label>
            <input id="c-name" className={field} style={radius} value={form.name} onChange={set('name')} autoComplete="name" aria-invalid={!!errors.name} aria-describedby={errors.name ? 'c-name-e' : undefined} />
            {errors.name && <p id="c-name-e" className="mt-1.5 text-sm text-red-700">{errors.name}</p>}
          </div>
          <div>
            <label htmlFor="c-email" className="mb-2 block text-[0.74rem] uppercase tracking-[0.2em] opacity-70">Email</label>
            <input id="c-email" type="email" className={field} style={radius} value={form.email} onChange={set('email')} autoComplete="email" aria-invalid={!!errors.email} aria-describedby={errors.email ? 'c-email-e' : undefined} />
            {errors.email && <p id="c-email-e" className="mt-1.5 text-sm text-red-700">{errors.email}</p>}
          </div>
          <div>
            <label htmlFor="c-message" className="mb-2 block text-[0.74rem] uppercase tracking-[0.2em] opacity-70">Message</label>
            <textarea id="c-message" rows={6} className={field} style={radius} value={form.message} onChange={set('message')} aria-invalid={!!errors.message} aria-describedby={errors.message ? 'c-message-e' : undefined} />
            {errors.message && <p id="c-message-e" className="mt-1.5 text-sm text-red-700">{errors.message}</p>}
          </div>

          {!c.email && !c.formEndpoint && <p className="text-sm text-red-700" role="alert">No contact email is configured for this site yet.</p>}
          <Button type="submit" variant="primary" disabled={status === 'sending'}>{status === 'sending' ? 'Sending…' : 'Send message'}</Button>
          {status === 'done' && (
            <p className="border-l-2 border-accent bg-surface px-4 py-3 text-sm" role="status">Thank you. Your message has been sent and we will reply by email soon.</p>
          )}
          {status === 'failed' && (
            <p className="text-sm text-red-700" role="alert">
              Sorry, the message could not be sent. Please email us at <a className="underline" href={`mailto:${c.email}`}>{c.email}</a>.
            </p>
          )}
          {sent && !c.formEndpoint && (
            <p className="text-sm opacity-80" role="status">
              Your email app should now open with the message ready to send. If nothing opened, write to{' '}
              <a className="underline" href={`mailto:${c.email}`}>{c.email}</a>.
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
