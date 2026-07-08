import React, {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from 'react';
import { ScrollView, Text, View } from 'react-native';

const AUTO_SCROLL_AFTER_USER_SCROLL = 6000;
const LRC_LINE = /^(\[[0-9]+:[0-9]+(\.[0-9]+)?\])+.*/;
const LRC_TIMESTAMP_WITH_BRACKET = /\[[0-9]+:[0-9]+(\.[0-9]+)?\]/g;
const LRC_TIMESTAMP = /[0-9]+/g;

const getRandomString = () => Math.random().toString(36).slice(2, 12);

export const parseLrc = (lrc = '') => {
  const lrcLineList = [];
  const lineList = String(lrc).split('\n');

  for (const line of lineList) {
    if (!LRC_LINE.test(line)) {
      continue;
    }

    const timeStringList = line.match(LRC_TIMESTAMP_WITH_BRACKET) || [];
    const content = line.replace(LRC_TIMESTAMP_WITH_BRACKET, '');

    for (const timeString of timeStringList) {
      const [minute, second, millisecond = '0'] = timeString.match(LRC_TIMESTAMP) || [];

      lrcLineList.push({
        id: getRandomString(),
        millisecond:
          Number.parseInt(minute, 10) * 60 * 1000
          + Number.parseInt(second, 10) * 1000
          + Number.parseInt(millisecond, 10),
        content,
      });
    }
  }

  return lrcLineList.sort((a, b) => a.millisecond - b.millisecond);
};

const useDebounce = (fn, delay) => {
  const timeoutRef = useRef(null);

  return (...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      fn(...args);
    }, delay);
  };
};

const useCurrentIndex = ({ lrcLineList, currentTime }) =>
  useMemo(() => {
    const length = lrcLineList.length;

    for (let i = length - 1; i >= 0; i -= 1) {
      if (currentTime >= lrcLineList[i].millisecond) {
        return i;
      }
    }

    return 0;
  }, [currentTime, lrcLineList]);

const useLocalAutoScroll = ({ autoScroll, autoScrollAfterUserScroll }) => {
  const [localAutoScroll, setLocalAutoScroll] = useState(autoScroll);

  useEffect(() => {
    setLocalAutoScroll(autoScroll);
  }, [autoScroll]);

  const resetLocalAutoScroll = () => {
    setLocalAutoScroll(true);
  };

  const debouncedReset = useDebounce(() => {
    setLocalAutoScroll(autoScroll);
  }, autoScrollAfterUserScroll);

  const onScroll = () => {
    if (!autoScroll) {
      return;
    }

    setLocalAutoScroll(false);
    debouncedReset();
  };

  return {
    localAutoScroll,
    onScroll,
    resetLocalAutoScroll,
  };
};

export const Lyric = forwardRef(function Lyric(
  {
    lrc,
    lineRenderer = ({ lrcLine: { content }, active }) => (
      <Text
        style={{
          textAlign: 'center',
          color: active ? 'white' : 'gray',
          fontSize: active ? 16 : 13,
          opacity: active ? 1 : 0.4,
          fontWeight: active ? '500' : '400',
        }}
      >
        {content}
      </Text>
    ),
    currentTime = 0,
    autoScroll = true,
    lineHeight = 26,
    activeLineHeight = lineHeight,
    autoScrollAfterUserScroll = AUTO_SCROLL_AFTER_USER_SCROLL,
    onCurrentLineChange,
    height = 500,
    style,
    ...props
  },
  ref
) {
  const lrcRef = useRef(null);
  const lrcLineList = useMemo(() => parseLrc(lrc), [lrc]);
  const currentIndex = useCurrentIndex({ lrcLineList, currentTime });
  const { localAutoScroll, resetLocalAutoScroll, onScroll } = useLocalAutoScroll({
    autoScroll,
    autoScrollAfterUserScroll,
  });

  useEffect(() => {
    if (localAutoScroll) {
      lrcRef.current?.scrollTo({
        y: currentIndex * lineHeight || 0,
        animated: true,
      });
    }
  }, [currentIndex, lineHeight, localAutoScroll]);

  useEffect(() => {
    onCurrentLineChange?.({
      index: currentIndex,
      lrcLine: lrcLineList[currentIndex] || null,
    });
  }, [currentIndex, lrcLineList, onCurrentLineChange]);

  useImperativeHandle(ref, () => ({
    getCurrentLine: () => ({
      index: currentIndex,
      lrcLine: lrcLineList[currentIndex] || null,
    }),
    scrollToCurrentLine: () => {
      resetLocalAutoScroll();
      lrcRef.current?.scrollTo({
        y: currentIndex * lineHeight || 0,
        animated: true,
      });
    },
  }));

  const lyricNodeList = useMemo(
    () =>
      lrcLineList.map((lrcLine, index) => (
        <View
          key={lrcLine.id}
          style={{
            height: currentIndex === index ? activeLineHeight : lineHeight,
          }}
        >
          {lineRenderer({ lrcLine, index, active: currentIndex === index })}
        </View>
      )),
    [activeLineHeight, currentIndex, lineHeight, lineRenderer, lrcLineList]
  );

  return (
    <ScrollView
      {...props}
      ref={lrcRef}
      scrollEventThrottle={30}
      onScroll={onScroll}
      style={[style, { height }]}
    >
      <View>
        {autoScroll ? <View style={{ width: '100%', height: 0.45 * height }} /> : null}
        {lyricNodeList}
        {autoScroll ? <View style={{ width: '100%', height: 0.5 * height }} /> : null}
      </View>
    </ScrollView>
  );
});

export default Lyric;
