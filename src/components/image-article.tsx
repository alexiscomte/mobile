import { Image } from 'expo-image';
import React, { useEffect, useState } from 'react';
import {
  IMGElementContainer,
  IMGElementContentAlt,
  useIMGElementProps,
  useIMGElementStateWithCache,
  type CustomBlockRenderer,
  type CustomRendererProps,
  type TBlock,
} from 'react-native-render-html';

import { SvgXml } from 'react-native-svg';

import { texteEmbarque } from '@/embarque';

const DIMENSIONS_INITIALES = { width: 100, height: 100 };

function ImageSvgArticle(props: CustomRendererProps<TBlock>) {
  const imageProps = useIMGElementProps(props);
  const [dimensions, setDimensions] = useState(imageProps.initialDimensions || DIMENSIONS_INITIALES);
  const [echec, setEchec] = useState(false);
  // SVG embarqué (data-svg = clé de la ressource) : son texte est lu hors ligne puis dessiné par react-native-svg (voir embarque.ts)
  const cle = props.tnode.attributes['data-svg'];
  const aResoudre = !!cle && cle !== '1';
  const [xml, setXml] = useState<string | null>(null);
  const [resolu, setResolu] = useState(!aResoudre);
  useEffect(() => {
    if (!aResoudre) return undefined;
    let actif = true;
    texteEmbarque(cle).then((t) => { if (actif) { setXml(t && t.includes('<svg') ? t : null); setResolu(true); } }, () => { if (actif) setResolu(true); });
    return () => { actif = false; };
  }, [aResoudre, cle]);
  // Le hook avec cache conserve les contraintes HTML sans appeler Image.getSize de React Native,
  // qui ne sait pas décoder les SVG. Expo fournit les dimensions naturelles après chargement.
  const etat = useIMGElementStateWithCache({ ...imageProps, cachedNaturalDimensions: dimensions });
  const fit = imageProps.objectFit;
  const contentFit = fit === 'contain' || fit === 'fill' || fit === 'none' || fit === 'scale-down' ? fit : 'cover';
  return (
    <IMGElementContainer {...imageProps.containerProps} style={etat.containerStyle}>
      {!resolu ? null : xml ? (
        <SvgXml xml={xml} width={etat.dimensions.width} height={etat.dimensions.height}
          accessible={!!imageProps.alt} accessibilityLabel={imageProps.alt} />
      ) : echec || etat.type === 'error' ? <IMGElementContentAlt {...etat} /> : (
        <Image
          source={etat.source}
          style={[etat.dimensions, etat.imageStyle]}
          contentFit={contentFit}
          accessible={!!imageProps.alt}
          accessibilityLabel={imageProps.alt}
          onLoad={({ source: { width, height } }) => {
            if (width > 0 && height > 0) {
              setDimensions((actuelles) => actuelles.width === width && actuelles.height === height ? actuelles : { width, height });
            }
          }}
          onError={() => setEchec(true)}
        />
      )}
    </IMGElementContainer>
  );
}

/** Les photos restent rendues par la bibliothèque HTML ; seuls les SVG utilisent Expo Image. */
export const ImageArticle: CustomBlockRenderer = (props) => {
  const src = props.tnode.attributes.src || '';
  if (!!props.tnode.attributes['data-svg'] || /\.svg(?:[?#]|$)|^data:image\/svg\+xml[;,]/i.test(src)) {
    return <ImageSvgArticle key={src} {...props} />;
  }
  return <props.InternalRenderer {...props} />;
};
