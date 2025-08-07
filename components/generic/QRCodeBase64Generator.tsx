import React, { useEffect, useRef } from "react";
import QRCode from "react-native-qrcode-svg";

type Props = {
  value: string;
  onGenerated: (base64: string) => void;
};

export const QRCodeBase64Generator = ({ value, onGenerated }: Props) => {
  const svgRef = useRef<any>(null);

  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.toDataURL((data: string) => {
        const base64 = `data:image/png;base64,${data}`;
        onGenerated(base64);
      });
    }
  }, [value]);

  return (
    <QRCode
      value={value}
      size={150}
      getRef={(ref) => (svgRef.current = ref)}
    />
  );
};
