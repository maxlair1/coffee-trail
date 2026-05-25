type CafeMapProps = {
  name: string;
  city: string | null;
  state: string | null;
  address?: string | null;
};

export function Map({ name, city, state, address }: CafeMapProps) {
  const query = encodeURIComponent(
    [address ?? name, city, state].filter(Boolean).join(", ")
  );

  const src = `https://maps.google.com/maps?q=${query}&output=embed`;

  return (
    <iframe
      src={src}
      width="100%"
      height="400"
      style={{ border: 0 }}
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}