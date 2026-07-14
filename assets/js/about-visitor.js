export function initAboutVisitorInfo() {
  const visitorIPElements = document.querySelectorAll('[data-visitor-ip]');
  const visitorLocationElements = document.querySelectorAll('[data-visitor-location]');

  if (!visitorIPElements.length && !visitorLocationElements.length) {
    return;
  }

  const visitorCacheKey = 'imx-about-visitor-info';
  const visitorCacheDuration = 10 * 60 * 1000;
  let visitorIPText = '正在获取';
  let regionFullText = '正在获取';
  const chinaRegionNames = {
    Anhui: '安徽',
    Beijing: '北京',
    Chongqing: '重庆',
    Fujian: '福建',
    Gansu: '甘肃',
    Guangdong: '广东',
    Guangxi: '广西',
    Guizhou: '贵州',
    Hainan: '海南',
    Hebei: '河北',
    Heilongjiang: '黑龙江',
    Henan: '河南',
    Hubei: '湖北',
    Hunan: '湖南',
    'Inner Mongolia': '内蒙古',
    Jiangsu: '江苏',
    Jiangxi: '江西',
    Jilin: '吉林',
    Liaoning: '辽宁',
    Ningxia: '宁夏',
    Qinghai: '青海',
    Shaanxi: '陕西',
    Shandong: '山东',
    Shanghai: '上海',
    Shanxi: '山西',
    Sichuan: '四川',
    Tianjin: '天津',
    Tibet: '西藏',
    Xinjiang: '新疆',
    Yunnan: '云南',
    Zhejiang: '浙江',
    'Hong Kong': '香港',
    Macau: '澳门',
    Taiwan: '台湾'
  };
  const chinaCityNames = {
    Beijing: '北京',
    Changsha: '长沙',
    Chengdu: '成都',
    Chongqing: '重庆',
    Guangzhou: '广州',
    Hangzhou: '杭州',
    Nanjing: '南京',
    Shanghai: '上海',
    Shenzhen: '深圳',
    Suzhou: '苏州',
    Tianjin: '天津',
    Wuhan: '武汉',
    "Xi'an": '西安',
    Xian: '西安'
  };
  const countryNames = {
    Canada: '加拿大',
    China: '中国',
    France: '法国',
    Germany: '德国',
    'Hong Kong': '香港',
    India: '印度',
    Japan: '日本',
    Macau: '澳门',
    Singapore: '新加坡',
    Taiwan: '台湾',
    'United Kingdom': '英国',
    'United States': '美国',
    'United States of America': '美国',
    USA: '美国'
  };
  const countryCodeNames = {
    CA: '加拿大',
    CN: '中国',
    DE: '德国',
    FR: '法国',
    GB: '英国',
    HK: '香港',
    IN: '印度',
    JP: '日本',
    MO: '澳门',
    SG: '新加坡',
    TW: '台湾',
    UK: '英国',
    US: '美国',
    USA: '美国'
  };
  function cleanPlaceName(value) {
    return String(value || '')
      .replace(/\s+/g, ' ')
      .replace(/ Province$/i, '')
      .replace(/ City$/i, '')
      .trim();
  }

  function getCountryName(country, countryCode) {
    const cleanCountry = cleanPlaceName(country);
    const cleanCode = String(countryCode || '').toUpperCase();

    return countryNames[cleanCountry] || countryCodeNames[cleanCode] || cleanCountry || cleanCode;
  }

  function escapeRegularExpression(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function withoutCountryPrefix(value, countryName) {
    const place = cleanPlaceName(value);
    const countryPrefix = escapeRegularExpression(countryName);

    return place
      .replace(countryPrefix ? new RegExp(`^${countryPrefix}\\s*`, 'i') : /$^/, '')
      .replace(/^United States(?: of America)?\s*/i, '')
      .replace(/^USA\s*/i, '')
      .replace(/^US\s+/i, '')
      .replace(/^美国\s*/, '')
      .replace(/州$/i, '')
      .trim();
  }

  function compactChinaPlace(value, aliases) {
    const place = cleanPlaceName(value);
    const normalized = aliases[place] || place;

    return normalized
      .replace(/壮族自治区|回族自治区|维吾尔自治区|自治区|特别行政区|省|市/g, '')
      .trim();
  }

  function formatRegion(data) {
    if (!data || data.success === false) {
      return null;
    }

    const city = data.city || data.cityName || '';
    const region = data.region || data.region_name || data.regionName || data.province || '';
    const country = data.country || data.country_name || data.countryName || '';
    const countryCode = String(data.country_code || data.countryCode || data.countryCode2 || '').toUpperCase();

    if (country === '中国' || country === 'China' || country === 'CN' || countryCode === 'CN') {
      const shortRegion = [
        compactChinaPlace(region, chinaRegionNames),
        compactChinaPlace(city, chinaCityNames)
      ].filter(Boolean).filter((item, index, array) => array.indexOf(item) === index).join('');

      return {
        full: shortRegion,
        short: shortRegion
      };
    }

    const countryName = getCountryName(country, countryCode);
    const cleanRegion = withoutCountryPrefix(region, countryName);
    const cleanCity = withoutCountryPrefix(city, countryName);
    const fullRegion = [
      countryName,
      cleanRegion,
      cleanCity
    ].filter(Boolean).filter((item, index, array) => array.indexOf(item) === index).join(' ');

    return {
      full: fullRegion,
      short: fullRegion
    };
  }

  function formatIPAddress(data) {
    if (!data || data.success === false) {
      return '';
    }

    return String(
      data.ip ||
      data.ipAddress ||
      data.ip_address ||
      data.query ||
      ''
    ).trim();
  }

  async function fetchRegionJSON(url) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = controller ? window.setTimeout(() => controller.abort(), 2800) : 0;

    try {
      const response = await window.fetch(url, {
        cache: 'no-store',
        signal: controller ? controller.signal : undefined
      });

      if (!response.ok) {
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    } finally {
      if (timeout) {
        window.clearTimeout(timeout);
      }
    }
  }

  function updateVisitorInfo() {
    visitorIPElements.forEach((element) => {
      element.textContent = visitorIPText;
    });

    visitorLocationElements.forEach((element) => {
      element.textContent = regionFullText;
    });
  }

  function isResolvedVisitorValue(value) {
    return Boolean(value && value !== '正在获取' && value !== '获取失败' && value !== '地区未知');
  }

  function cacheVisitorInfo() {
    if (!isResolvedVisitorValue(visitorIPText) && !isResolvedVisitorValue(regionFullText)) {
      return;
    }

    try {
      window.sessionStorage.setItem(visitorCacheKey, JSON.stringify({
        ip: isResolvedVisitorValue(visitorIPText) ? visitorIPText : '',
        location: isResolvedVisitorValue(regionFullText) ? regionFullText : '',
        timestamp: Date.now()
      }));
    } catch (error) {
      // Visitor information remains available even when session storage is blocked.
    }
  }

  function restoreCachedVisitorInfo() {
    try {
      const cachedValue = window.sessionStorage.getItem(visitorCacheKey);

      if (!cachedValue) {
        return false;
      }

      const cached = JSON.parse(cachedValue);

      if (!cached || Date.now() - Number(cached.timestamp || 0) > visitorCacheDuration) {
        window.sessionStorage.removeItem(visitorCacheKey);
        return false;
      }

      if (cached.ip) {
        visitorIPText = String(cached.ip);
      }

      if (cached.location) {
        regionFullText = String(cached.location);
      }

      updateVisitorInfo();
      return isResolvedVisitorValue(visitorIPText) && isResolvedVisitorValue(regionFullText);
    } catch (error) {
      return false;
    }
  }

  async function loadRegion() {
    if (!window.fetch) {
      visitorIPText = '获取失败';
      regionFullText = '地区未知';
      updateVisitorInfo();
      return;
    }

    const regionAPIs = [
      'https://ipwho.is/?lang=zh-CN',
      'https://ipapi.co/json/',
      'https://freeipapi.com/api/json',
      'https://api.ip.sb/geoip'
    ];

    for (let index = 0; index < regionAPIs.length; index += 1) {
      const data = await fetchRegionJSON(regionAPIs[index]);
      const nextIP = formatIPAddress(data);
      const nextRegion = formatRegion(data);
      let visitorInfoChanged = false;

      if (nextIP && !isResolvedVisitorValue(visitorIPText)) {
        visitorIPText = nextIP;
        visitorInfoChanged = true;
      }

      if (nextRegion && (nextRegion.full || nextRegion.short) && !isResolvedVisitorValue(regionFullText)) {
        regionFullText = nextRegion.full || nextRegion.short;
        visitorInfoChanged = true;
      }

      if (visitorInfoChanged) {
        updateVisitorInfo();
        cacheVisitorInfo();
      }

      if (isResolvedVisitorValue(visitorIPText) && isResolvedVisitorValue(regionFullText)) {
        return;
      }
    }

    if (visitorIPText === '正在获取') {
      visitorIPText = '获取失败';
    }
    if (!isResolvedVisitorValue(regionFullText)) {
      regionFullText = '地区未知';
    }
    updateVisitorInfo();
  }

  updateVisitorInfo();
  if (!restoreCachedVisitorInfo()) {
    loadRegion();
  }
}
