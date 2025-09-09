import React, {
  useCallback,
  useRef,
  useState,
  useEffect,
  useMemo,
} from 'react';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

// Constants moved outside component
const SLIDER_CONTAINER_STYLE = {
  padding: '10px',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderRadius: '4px',
  border: '1px solid rgba(255, 255, 255, 0.1)',
} as const;

const SLIDER_LABEL_STYLE = {
  fontSize: '12px',
  color: 'rgba(255, 255, 255, 0.8)',
  marginBottom: '5px',
  display: 'flex',
  justifyContent: 'space-between',
} as const;

const SLIDER_TRACK_STYLE = {
  width: '100%',
  height: '20px',
  backgroundColor: 'rgba(255, 255, 255, 0.1)',
  borderRadius: '10px',
  position: 'relative' as const,
  cursor: 'pointer',
  border: '1px solid rgba(255, 255, 255, 0.2)',
};

const SLIDER_FILL_STYLE = {
  height: '20px',
  backgroundColor: '#4CAF50',
  borderRadius: '10px',
  top: 1,
  position: 'absolute' as const,
};

const SLIDER_THUMB_STYLE = {
  width: '16px',
  height: '16px',
  backgroundColor: 'white',
  borderRadius: '50%',
  position: 'absolute' as const,
  top: '2px',
  cursor: 'grab',
  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
};

const SLIDER_FILL_CONTAINER_STYLE = {
  position: 'relative' as const,
};

const INVISIBLE_TRACK_STYLE = {
  position: 'absolute' as const,
  top: '0',
  left: '10px',
  right: '10px',
  height: '100%',
  cursor: 'pointer',
};

const Slider: React.FC<SliderProps> = ({
  label,
  value,
  min,
  max,
  onChange,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const invisibleTrackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);

  const percentage = useMemo(
    () => ((value - min) / (max - min)) * 100,
    [value, min, max]
  );

  const updateValue = useCallback(
    (clientX: number) => {
      if (!invisibleTrackRef.current) return;

      const rect = invisibleTrackRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const trackWidth = rect.width;
      const newPercentage = Math.max(
        0,
        Math.min(100, (clickX / trackWidth) * 100)
      );
      const newValue = min + (newPercentage / 100) * (max - min);

      const boundedValue = Math.max(min, Math.min(max, newValue));
      onChange(boundedValue);
    },
    [min, max, onChange]
  );

  const handleTrackClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (
        event.target === event.currentTarget ||
        (event.target as HTMLElement).className !== 'slider-thumb'
      ) {
        updateValue(event.clientX);
      }
    },
    [updateValue]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      setIsDragging(true);
      updateValue(event.clientX);
    },
    [updateValue]
  );

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        updateValue(event.clientX);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, updateValue]);

  // Memoize container width update function
  const updateContainerWidth = useCallback(() => {
    if (trackRef.current) {
      setContainerWidth(trackRef.current.offsetWidth);
    }
  }, []);

  // Get container width on mount and resize
  useEffect(() => {
    updateContainerWidth();
    window.addEventListener('resize', updateContainerWidth);

    return () => {
      window.removeEventListener('resize', updateContainerWidth);
    };
  }, [updateContainerWidth]);

  // Memoize thumb position calculation
  const thumbLeft = useMemo(() => `calc(${percentage}% - 8px)`, [percentage]);

  // Memoize track width calculation
  const trackWidth = useMemo(() => {
    if (containerWidth === 0) return '20px'; // Fallback while measuring

    const minWidth = 22; // 22px at 0%
    const maxWidth = containerWidth; // 100% width at 100%
    const currentWidth = minWidth + (percentage / 100) * (maxWidth - minWidth);

    return `${currentWidth}px`;
  }, [percentage, containerWidth]);

  // Memoize dynamic styles
  const fillStyle = useMemo(
    () => ({
      ...SLIDER_FILL_STYLE,
      width: trackWidth,
    }),
    [trackWidth]
  );

  const thumbStyle = useMemo(
    () => ({
      ...SLIDER_THUMB_STYLE,
      left: thumbLeft,
      cursor: isDragging ? 'grabbing' : 'grab',
    }),
    [thumbLeft, isDragging]
  );

  // Memoize formatted value
  const formattedValue = useMemo(() => value.toFixed(0), [value]);

  return (
    <div style={SLIDER_CONTAINER_STYLE}>
      <div style={SLIDER_LABEL_STYLE}>
        <span>{label}</span>
        <span>{formattedValue}</span>
      </div>
      <div style={SLIDER_FILL_CONTAINER_STYLE}>
        <div style={fillStyle} />
        <div ref={trackRef} style={SLIDER_TRACK_STYLE}>
          {/* Invisible track for interaction - smaller area with margins */}
          <div
            ref={invisibleTrackRef}
            style={INVISIBLE_TRACK_STYLE}
            onClick={handleTrackClick}
            onMouseDown={handleMouseDown}
          >
            {/* Thumb is now inside the invisible track */}
            <div className='slider-thumb' style={thumbStyle} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Slider;
