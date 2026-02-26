import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import {
  PanResponder,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  id: string;
  points: readonly Point[];
}

interface SvgExportHandle {
  toDataURL(callback: (base64: string) => void): void;
}

export interface DreamDrawingCanvasHandle {
  clear(): void;
  exportToPngBase64(): Promise<string>;
}

interface DreamDrawingCanvasProps {
  isInfraredMode: boolean;
}

const styles = StyleSheet.create({
  canvasSurface: {
    borderRadius: 12,
    borderWidth: 1,
    height: 220,
    marginTop: 10,
    overflow: 'hidden',
  },
});

function clampPoint(point: Point, width: number, height: number): Point {
  return {
    x: Math.max(0, Math.min(point.x, width)),
    y: Math.max(0, Math.min(point.y, height)),
  };
}

function toPath(points: readonly Point[]): string {
  const firstPoint = points[0];

  if (!firstPoint) {
    return '';
  }

  if (points.length === 1) {
    return `M ${firstPoint.x} ${firstPoint.y}`;
  }

  const commands = points.slice(1).map((point) => `L ${point.x} ${point.y}`);

  return [`M ${firstPoint.x} ${firstPoint.y}`, ...commands].join(' ');
}

export const DreamDrawingCanvas = forwardRef<DreamDrawingCanvasHandle, DreamDrawingCanvasProps>(
  function DreamDrawingCanvas({ isInfraredMode }, ref) {
    const svgRef = useRef<SvgExportHandle | null>(null);
    const nextStrokeNumberRef = useRef(1);
    const activeStrokeIdRef = useRef<string | null>(null);
    const activeStrokePointsRef = useRef<Point[] | null>(null);

    const [strokes, setStrokes] = useState<readonly Stroke[]>([]);
    const [layoutSize, setLayoutSize] = useState({
      width: 1,
      height: 1,
    });

    const strokeColor = isInfraredMode ? '#FF2A00' : '#111111';
    const canvasBackgroundColor = isInfraredMode ? '#000000' : '#FFFFFF';
    const canvasBorderColor = isInfraredMode ? '#C81600' : '#D9D9D9';

    const startStroke = (event: GestureResponderEvent) => {
      const initialPoint = clampPoint(
        {
          x: event.nativeEvent.locationX,
          y: event.nativeEvent.locationY,
        },
        layoutSize.width,
        layoutSize.height,
      );
      const strokeId = `stroke-${nextStrokeNumberRef.current}`;
      nextStrokeNumberRef.current += 1;
      activeStrokeIdRef.current = strokeId;
      activeStrokePointsRef.current = [initialPoint];

      setStrokes((current) => [
        ...current,
        {
          id: strokeId,
          points: [initialPoint],
        },
      ]);
    };

    const appendStrokePoint = (event: GestureResponderEvent) => {
      const activeStrokeId = activeStrokeIdRef.current;
      const activeStrokePoints = activeStrokePointsRef.current;

      if (!activeStrokeId || !activeStrokePoints) {
        return;
      }

      const nextPoint = clampPoint(
        {
          x: event.nativeEvent.locationX,
          y: event.nativeEvent.locationY,
        },
        layoutSize.width,
        layoutSize.height,
      );
      const nextPoints = [...activeStrokePoints, nextPoint];
      activeStrokePointsRef.current = nextPoints;

      setStrokes((current) =>
        current.map((stroke) =>
          stroke.id === activeStrokeId
            ? {
                ...stroke,
                points: nextPoints,
              }
            : stroke,
        ),
      );
    };

    const finishStroke = () => {
      activeStrokeIdRef.current = null;
      activeStrokePointsRef.current = null;
    };

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: startStroke,
      onPanResponderMove: appendStrokePoint,
      onPanResponderRelease: finishStroke,
      onPanResponderTerminate: finishStroke,
      onPanResponderTerminationRequest: () => false,
    });

    const handleLayout = (event: LayoutChangeEvent) => {
      setLayoutSize({
        width: Math.max(1, event.nativeEvent.layout.width),
        height: Math.max(1, event.nativeEvent.layout.height),
      });
    };

    useImperativeHandle(
      ref,
      () => ({
        clear() {
          activeStrokeIdRef.current = null;
          activeStrokePointsRef.current = null;
          setStrokes([]);
        },
        async exportToPngBase64() {
          const svgHandle = svgRef.current;

          if (!svgHandle) {
            throw new Error('Drawing canvas is not ready.');
          }

          return new Promise<string>((resolve, reject) => {
            try {
              svgHandle.toDataURL((base64) => {
                if (base64.trim().length === 0) {
                  reject(new Error('Exported PNG is empty.'));
                  return;
                }

                resolve(base64);
              });
            } catch (error) {
              reject(error);
            }
          });
        },
      }),
      [],
    );

    return (
      <View
        onLayout={handleLayout}
        style={[
          styles.canvasSurface,
          {
            borderColor: canvasBorderColor,
            backgroundColor: canvasBackgroundColor,
          },
        ]}
        testID="dream-detail-drawing-canvas"
        {...panResponder.panHandlers}
      >
        <Svg
          ref={(value: unknown) => {
            svgRef.current = value as unknown as SvgExportHandle | null;
          }}
          height="100%"
          width="100%"
        >
          {strokes.map((stroke) => (
            <Path
              d={toPath(stroke.points)}
              fill="none"
              key={stroke.id}
              stroke={strokeColor}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={isInfraredMode ? 2.8 : 2.4}
            />
          ))}
        </Svg>
      </View>
    );
  },
);
