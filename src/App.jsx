// Radioactive Waste Calculator - integrated with sessionStorage
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, Calculator, Download, Trash2, LogOut, User, Database, FileText, BarChart3, Clock } from 'lucide-react';

const STORAGE_KEYS = {
  USER: 'radioactive_calc_user',
  HISTORY: 'radioactive_calc_history',
  SHARED_HISTORY: 'radioactive_calc_shared'
};

const ISOTOPES = {
  'tc99m': { name: 'Tc-99m', gamma: 0.033, halfLife: 6 },
  'f18': { name: 'F-18', gamma: 0.188, halfLife: 1.83 },
  'i131': { name: 'I-131', gamma: 0.0594, halfLife: 192.96 },
  'sm153': { name: 'Sm-153', gamma: 0.0227, halfLife: 46.5 },
  're186': { name: 'Re-186', gamma: 0.00454, halfLife: 89.28 },
  'lu177': { name: 'Lu-177', gamma: 0.00764, halfLife: 161.52 }
};

export default function RadioactiveWasteCalculator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', password: '', fullName: '', email: '' });
  const [isRegistering, setIsRegistering] = useState(false);
  const [selectedIsotope, setSelectedIsotope] = useState('');
  const [formData, setFormData] = useState({
    gamma: '',
    distance: '',
    radiation: '',
    mass: '',
    sampleName: '',
    measurementTime: '',
    targetTime: ''
  });
  const [results, setResults] = useState(null);
  const [decayPredictions, setDecayPredictions] = useState([]);
  const [history, setHistory] = useState([]);
  const [sharedHistory, setSharedHistory] = useState([]);
  const [activeTab, setActiveTab] = useState('calculator');

  useEffect(() => {
    loadStoredData();
  }, []);

  useEffect(() => {
    const now = new Date();
    const formatted = formatDateTimeForInput(now);
    setFormData(prev => ({
      ...prev,
      measurementTime: formatted,
      targetTime: formatted
    }));
  }, []);

  const formatDateTimeForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const formatDateTime = (date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  const loadStoredData = async () => {
    try {
      const storedUser = await window.storage.get(STORAGE_KEYS.USER);
      if (storedUser) {
        const user = JSON.parse(storedUser.value);
        setCurrentUser(user);
        setIsLoggedIn(true);
        await loadHistory(user.username);
      }
    } catch (error) {
      console.log('No stored user found');
    }
  };

  const loadHistory = async (username) => {
    try {
      const userHistoryKey = `${STORAGE_KEYS.HISTORY}_${username}`;
      const userHistory = await window.storage.get(userHistoryKey);
      if (userHistory) {
        setHistory(JSON.parse(userHistory.value));
      }
    } catch (error) {
      setHistory([]);
    }

    try {
      const sharedData = await window.storage.get(STORAGE_KEYS.SHARED_HISTORY, true);
      if (sharedData) {
        setSharedHistory(JSON.parse(sharedData.value));
      }
    } catch (error) {
      setSharedHistory([]);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const userKey = `user_${loginForm.username}`;
      const userData = await window.storage.get(userKey);
      if (userData) {
        const user = JSON.parse(userData.value);
        if (user.password === loginForm.password) {
          setCurrentUser(user);
          setIsLoggedIn(true);
          await window.storage.set(STORAGE_KEYS.USER, JSON.stringify(user));
          await loadHistory(user.username);
          setLoginForm({ username: '', password: '' });
        } else {
          alert('Password salah!');
        }
      } else {
        alert('Username tidak ditemukan!');
      }
    } catch (error) {
      alert('Username tidak ditemukan!');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const userKey = `user_${registerForm.username}`;
      try {
        await window.storage.get(userKey);
        alert('Username sudah terdaftar!');
        return;
      } catch {
        const newUser = {
          username: registerForm.username,
          password: registerForm.password,
          fullName: registerForm.fullName,
          email: registerForm.email,
          createdAt: new Date().toISOString()
        };
        await window.storage.set(userKey, JSON.stringify(newUser));
        alert('Registrasi berhasil! Silakan login.');
        setIsRegistering(false);
        setRegisterForm({ username: '', password: '', fullName: '', email: '' });
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  };

  const handleLogout = async () => {
    await window.storage.delete(STORAGE_KEYS.USER);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setHistory([]);
    setResults(null);
    setDecayPredictions([]);
  };

  const handleIsotopeChange = (value) => {
    setSelectedIsotope(value);
    setFormData({ ...formData, gamma: ISOTOPES[value].gamma.toString() });
  };

  const calculateDecay = (initialActivity, halfLife, timeElapsed) => {
    const decayConstant = Math.LN2 / halfLife;
    return initialActivity * Math.exp(-decayConstant * timeElapsed);
  };

  const calculateExposure = (activityMBq, gamma, distance) => {
    // Rumus: Paparan (µSv/jam) = (Aktivitas (MBq) × Faktor Gamma (µSv.m²/(MBq.hr))) / (Jarak (m))²
    return (activityMBq * gamma) / Math.pow(distance, 2);
  };

  const calculateActivity = () => {
    const gamma = parseFloat(formData.gamma);
    const distance = parseFloat(formData.distance);
    const radiation = parseFloat(formData.radiation);
    const mass = parseFloat(formData.mass);
    const measurementTime = new Date(formData.measurementTime);
    const targetTime = new Date(formData.targetTime);

    if (!gamma || !distance || !radiation || !mass || !formData.measurementTime || !formData.targetTime) {
      alert('Mohon lengkapi semua input!');
      return;
    }

    if (!selectedIsotope) {
      alert('Mohon pilih isotop untuk perhitungan waktu paruh!');
      return;
    }

    const activity = (radiation * Math.pow(distance, 2)) / gamma;
    const activityBq = activity * 1000000;
    const density = activityBq / mass;

    // Calculate time difference in hours
    const timeDiffMs = targetTime - measurementTime;
    const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

    // Calculate activity at target time
    const halfLife = ISOTOPES[selectedIsotope].halfLife;
    const targetActivity = calculateDecay(activity, halfLife, timeDiffHours);
    const targetActivityBq = targetActivity * 1000000;
    const targetDensity = targetActivityBq / mass;

    // Calculate 10 half-lives predictions
    const predictions = [];
    for (let i = 1; i <= 10; i++) {
      const timeAfterHalfLives = halfLife * i;
      const predictedTime = new Date(measurementTime.getTime() + timeAfterHalfLives * 60 * 60 * 1000);
      const predictedActivity = calculateDecay(activity, halfLife, timeAfterHalfLives);
      const predictedActivityBq = predictedActivity * 1000000;
      const predictedDensity = predictedActivityBq / mass;
      const predictedExposure = calculateExposure(predictedActivity, gamma, distance);

      predictions.push({
        halfLife: i,
        time: formatDateTime(predictedTime),
        activity: predictedActivity,
        activityBq: predictedActivityBq,
        density: predictedDensity,
        exposure: predictedExposure
      });
    }

    setDecayPredictions(predictions);

    const newResults = {
      activity: activity,
      activityKBq: activity * 1000,
      activityBq: activityBq,
      density: density,
      targetActivity: targetActivity,
      targetActivityBq: targetActivityBq,
      targetDensity: targetDensity,
      timeDiff: timeDiffHours
    };

    setResults(newResults);

    const historyEntry = {
      id: Date.now(),
      timestamp: new Date().toLocaleString('id-ID'),
      username: currentUser.username,
      sampleName: formData.sampleName || 'Sampel',
      isotope: ISOTOPES[selectedIsotope].name,
      gamma: gamma,
      distance: distance,
      radiation: radiation,
      mass: mass,
      measurementTime: formatDateTime(measurementTime),
      targetTime: formatDateTime(targetTime),
      activity: activity,
      density: density,
      targetActivity: targetActivity,
      targetDensity: targetDensity,
      predictions: predictions
    };

    saveToHistory(historyEntry);
  };

  const saveToHistory = async (entry) => {
    const newHistory = [entry, ...history];
    setHistory(newHistory);
    const userHistoryKey = `${STORAGE_KEYS.HISTORY}_${currentUser.username}`;
    await window.storage.set(userHistoryKey, JSON.stringify(newHistory));

    const newSharedHistory = [entry, ...sharedHistory];
    setSharedHistory(newSharedHistory);
    await window.storage.set(STORAGE_KEYS.SHARED_HISTORY, JSON.stringify(newSharedHistory), true);
  };

  const deleteHistoryEntry = async (id, isShared = false) => {
    if (!confirm('Hapus data ini?')) return;

    if (isShared) {
      const filtered = sharedHistory.filter(item => item.id !== id);
      setSharedHistory(filtered);
      await window.storage.set(STORAGE_KEYS.SHARED_HISTORY, JSON.stringify(filtered), true);
    } else {
      const filtered = history.filter(item => item.id !== id);
      setHistory(filtered);
      const userHistoryKey = `${STORAGE_KEYS.HISTORY}_${currentUser.username}`;
      await window.storage.set(userHistoryKey, JSON.stringify(filtered));
    }
  };

  const exportToCSV = () => {
    if (history.length === 0) {
      alert('Tidak ada data untuk diekspor!');
      return;
    }

    let csv = 'Timestamp,Username,Sampel,Isotop,Gamma,Jarak (m),Paparan (µSv/jam),Massa (gr),Waktu Ukur,Waktu Target,Aktivitas Awal (MBq),Densitas Awal (Bq/gr),Aktivitas Target (MBq),Densitas Target (Bq/gr)\n';
    
    history.forEach(item => {
      csv += `"${item.timestamp}","${item.username}","${item.sampleName}","${item.isotope}",${item.gamma},${item.distance},${item.radiation},${item.mass},"${item.measurementTime}","${item.targetTime}",${item.activity.toExponential(2)},${item.density.toFixed(4)},${item.targetActivity.toExponential(2)},${item.targetDensity.toFixed(4)}\n`;
      
      // Add predictions if available
      if (item.predictions && item.predictions.length > 0) {
        csv += '\n10 Waktu Paruh Predictions:\n';
        csv += 'T½ ke-,Waktu,Aktivitas (MBq),Aktivitas (Bq),Densitas (Bq/gr),Paparan (µSv/jam),% Tersisa\n';
        item.predictions.forEach(pred => {
          const percentRemaining = (100 / Math.pow(2, pred.halfLife)).toFixed(4);
          csv += `${pred.halfLife},"${pred.time}",${pred.activity ? pred.activity.toExponential(2) : 'N/A'},${pred.activityBq.toExponential(2)},${pred.density.toFixed(4)},${pred.exposure ? pred.exposure.toFixed(6) : 'N/A'},${percentRemaining}%\n`;
        });
        csv += '\n';
      }
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `riwayat_perhitungan_${currentUser.username}_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 via-blue-600 to-indigo-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <Activity className="h-12 w-12 text-purple-600" />
            </div>
            <CardTitle className="text-2xl text-center">
              {isRegistering ? 'Registrasi Akun' : 'Login'}
            </CardTitle>
            <CardDescription className="text-center">
              Sistem Kalkulator Densitas Aktivitas Limbah Radioaktif
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isRegistering ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    placeholder="Masukkan username"
                    value={loginForm.username}
                    onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Masukkan password"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  />
                </div>
                <Button onClick={handleLogin} className="w-full">Login</Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsRegistering(true)}
                >
                  Belum punya akun? Daftar
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reg-username">Username</Label>
                  <Input
                    id="reg-username"
                    placeholder="Username"
                    value={registerForm.username}
                    onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-fullname">Nama Lengkap</Label>
                  <Input
                    id="reg-fullname"
                    placeholder="Nama lengkap"
                    value={registerForm.fullName}
                    onChange={(e) => setRegisterForm({ ...registerForm, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="email@example.com"
                    value={registerForm.email}
                    onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Password"
                    value={registerForm.password}
                    onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  />
                </div>
                <Button onClick={handleRegister} className="w-full">Daftar</Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setIsRegistering(false)}
                >
                  Sudah punya akun? Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-3">
              <Activity className="h-8 w-8 text-purple-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Radioactive Waste Calculator</h1>
                <p className="text-xs text-gray-500">Professional Edition</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-700">
                <User className="h-4 w-4" />
                <span className="font-medium">{currentUser.fullName}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
            <TabsTrigger value="calculator">
              <Calculator className="h-4 w-4 mr-2" />
              Kalkulator
            </TabsTrigger>
            <TabsTrigger value="isotopes">
              <Database className="h-4 w-4 mr-2" />
              Isotop
            </TabsTrigger>
            <TabsTrigger value="history">
              <FileText className="h-4 w-4 mr-2" />
              Riwayat
            </TabsTrigger>
            <TabsTrigger value="shared">
              <BarChart3 className="h-4 w-4 mr-2" />
              Bersama
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calculator" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Kalkulator Densitas Aktivitas</CardTitle>
                <CardDescription>
                  Input parameter untuk menghitung aktivitas dan densitas limbah radioaktif
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="isotope-select">Pilih Isotop</Label>
                    <Select value={selectedIsotope} onValueChange={handleIsotopeChange}>
                      <SelectTrigger id="isotope-select">
                        <SelectValue placeholder="-- Pilih Isotop --" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ISOTOPES).map(([key, isotope]) => (
                          <SelectItem key={key} value={key}>
                            {isotope.name} (γ={isotope.gamma})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="gamma">Faktor Gamma (µSv.m²/(MBq.hr))</Label>
                    <Input
                      id="gamma"
                      type="number"
                      step="any"
                      placeholder="0.188"
                      value={formData.gamma}
                      onChange={(e) => setFormData({ ...formData, gamma: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="distance">Jarak Pengukuran (m)</Label>
                    <Input
                      id="distance"
                      type="number"
                      step="any"
                      placeholder="0.3"
                      value={formData.distance}
                      onChange={(e) => setFormData({ ...formData, distance: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="radiation">Paparan Radiasi (µSv/jam)</Label>
                    <Input
                      id="radiation"
                      type="number"
                      step="any"
                      placeholder="0.08"
                      value={formData.radiation}
                      onChange={(e) => setFormData({ ...formData, radiation: e.target.value })}
                    />
                    <p className="text-xs text-gray-500">Gunakan laju dosis, bukan total kumulatif</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mass">Massa Limbah (gr)</Label>
                    <Input
                      id="mass"
                      type="number"
                      step="any"
                      placeholder="1000"
                      value={formData.mass}
                      onChange={(e) => setFormData({ ...formData, mass: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="measurementTime">Waktu Ukur & Target</Label>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        id="measurementTime"
                        type="datetime-local"
                        value={formData.measurementTime}
                        onChange={(e) => setFormData({ ...formData, measurementTime: e.target.value })}
                      />
                      <Input
                        id="targetTime"
                        type="datetime-local"
                        value={formData.targetTime}
                        onChange={(e) => setFormData({ ...formData, targetTime: e.target.value })}
                      />
                    </div>
                    <p className="text-xs text-gray-500">Elapsed dihitung otomatis dari selisih kedua waktu ini</p>
                  </div>

                  <div className="space-y-2 md:col-span-2 lg:col-span-3">
                    <Label htmlFor="sampleName">Nama Sampel</Label>
                    <Input
                      id="sampleName"
                      placeholder="Sampel #1"
                      value={formData.sampleName}
                      onChange={(e) => setFormData({ ...formData, sampleName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button onClick={calculateActivity} className="flex-1">
                    <Calculator className="h-4 w-4 mr-2" />
                    Hitung
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        gamma: '',
                        distance: '',
                        radiation: '',
                        mass: '',
                        sampleName: '',
                        measurementTime: formatDateTimeForInput(new Date()),
                        targetTime: formatDateTimeForInput(new Date())
                      });
                      setSelectedIsotope('');
                      setResults(null);
                      setDecayPredictions([]);
                    }}
                  >
                    Reset
                  </Button>
                </div>

                {results && (
                  <div className="space-y-4">
                    <Alert className="bg-gradient-to-r from-purple-500 to-blue-500 text-white border-0">
                      <AlertDescription>
                        <div className="space-y-4">
                          <div>
                            <h3 className="font-semibold mb-2">Aktivitas Saat Ukur ({formData.measurementTime ? formatDateTime(new Date(formData.measurementTime)) : ''})</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div>
                                <div className="text-xs opacity-90">A₀ (MBq)</div>
                                <div className="text-xl font-bold">{results.activity.toExponential(2)}</div>
                              </div>
                              <div>
                                <div className="text-xs opacity-90">A₀ (kBq)</div>
                                <div className="text-xl font-bold">{results.activityKBq.toFixed(2)}</div>
                              </div>
                              <div>
                                <div className="text-xs opacity-90">A₀ (Bq)</div>
                                <div className="text-xl font-bold">{results.activityBq.toExponential(2)}</div>
                              </div>
                              <div>
                                <div className="text-xs opacity-90">Densitas (Bq/gr)</div>
                                <div className="text-xl font-bold">{results.density.toFixed(4)}</div>
                              </div>
                            </div>
                          </div>

                          {results.timeDiff !== 0 && (
                            <div className="border-t border-white/30 pt-4">
                              <h3 className="font-semibold mb-2">Prediksi Saat Target ({formData.targetTime ? formatDateTime(new Date(formData.targetTime)) : ''})</h3>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                  <div className="text-xs opacity-90">Elapsed: {Math.abs(results.timeDiff).toFixed(2)} jam</div>
                                </div>
                                <div>
                                  <div className="text-xs opacity-90">A (Bq)</div>
                                  <div className="text-xl font-bold">{results.targetActivityBq.toExponential(2)}</div>
                                </div>
                                <div>
                                  <div className="text-xs opacity-90">Densitas (Bq/gr)</div>
                                  <div className="text-xl font-bold">{results.targetDensity.toFixed(4)}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </AlertDescription>
                    </Alert>

                    {decayPredictions.length > 0 && (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Clock className="h-5 w-5 mr-2" />
                            Prediksi 10 Waktu Paruh
                          </CardTitle>
                          <CardDescription>
                            Isotop: {ISOTOPES[selectedIsotope].name} (T½ = {ISOTOPES[selectedIsotope].halfLife} jam) | Jarak pengukuran: {formData.distance} m
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                              <thead>
                                <tr className="bg-gray-100 border-b">
                                  <th className="px-4 py-3 text-left text-sm font-semibold">T½ ke-</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Waktu</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Aktivitas (MBq)</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Aktivitas (Bq)</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Densitas (Bq/gr)</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">Paparan (µSv/jam)</th>
                                  <th className="px-4 py-3 text-left text-sm font-semibold">% Tersisa</th>
                                </tr>
                              </thead>
                              <tbody>
                                {decayPredictions.map((pred) => (
                                  <tr key={pred.halfLife} className="border-b hover:bg-gray-50">
                                    <td className="px-4 py-3 font-medium">{pred.halfLife}</td>
                                    <td className="px-4 py-3 text-sm">{pred.time}</td>
                                    <td className="px-4 py-3 text-sm">{pred.activity.toExponential(2)}</td>
                                    <td className="px-4 py-3 text-sm">{pred.activityBq.toExponential(2)}</td>
                                    <td className="px-4 py-3 text-sm">{pred.density.toFixed(4)}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-orange-600">
                                      {pred.exposure.toFixed(6)}
                                    </td>
                                    <td className="px-4 py-3 text-sm">
                                      {(100 / Math.pow(2, pred.halfLife)).toFixed(4)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <strong>Catatan:</strong> Paparan radiasi dihitung pada jarak {formData.distance} m menggunakan rumus: 
                              <span className="font-mono text-xs block mt-1">
                                Paparan (µSv/jam) = [A(MBq) × γ (µSv.m²/(MBq.hr))] / d²(m²)
                              </span>
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="isotopes">
            <Card>
              <CardHeader>
                <CardTitle>Data Faktor Gamma Isotop</CardTitle>
                <CardDescription>
                  Referensi nilai faktor gamma untuk berbagai isotop radioaktif
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-4 py-3 text-left text-sm font-semibold">Isotop</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">mSv.m²/(MBq.hr)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">µSv.m²/(MBq.hr)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Half-life (jam)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(ISOTOPES).map(([key, isotope]) => (
                        <tr key={key} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium">{isotope.name}</td>
                          <td className="px-4 py-3">{(isotope.gamma / 1000).toExponential(2)}</td>
                          <td className="px-4 py-3">{isotope.gamma.toExponential(2)}</td>
                          <td className="px-4 py-3">{isotope.halfLife}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Riwayat Perhitungan Pribadi</CardTitle>
                    <CardDescription>Data perhitungan Anda ({history.length} entri)</CardDescription>
                  </div>
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-4 py-3 text-left text-sm font-semibold">Waktu</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Sampel</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Isotop</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Waktu Ukur</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Waktu Target</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">A₀ (MBq)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">D₀ (Bq/gr)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">At (MBq)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Dt (Bq/gr)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.length === 0 ? (
                        <tr>
                          <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                            Belum ada data perhitungan
                          </td>
                        </tr>
                      ) : (
                        history.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs">{item.timestamp}</td>
                            <td className="px-4 py-3 text-sm">{item.sampleName}</td>
                            <td className="px-4 py-3 text-sm">{item.isotope}</td>
                            <td className="px-4 py-3 text-xs">{item.measurementTime}</td>
                            <td className="px-4 py-3 text-xs">{item.targetTime}</td>
                            <td className="px-4 py-3 text-sm">{item.activity.toExponential(2)}</td>
                            <td className="px-4 py-3 text-sm">{item.density.toFixed(4)}</td>
                            <td className="px-4 py-3 text-sm">{item.targetActivity.toExponential(2)}</td>
                            <td className="px-4 py-3 text-sm">{item.targetDensity.toFixed(4)}</td>
                            <td className="px-4 py-3">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => deleteHistoryEntry(item.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="shared">
            <Card>
              <CardHeader>
                <CardTitle>Data Bersama (Semua Pengguna)</CardTitle>
                <CardDescription>
                  Data perhitungan dari semua pengguna sistem ({sharedHistory.length} entri)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="px-4 py-3 text-left text-sm font-semibold">Waktu</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">User</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Sampel</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Isotop</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">A₀ (MBq)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">D₀ (Bq/gr)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">At (MBq)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Dt (Bq/gr)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sharedHistory.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                            Belum ada data bersama
                          </td>
                        </tr>
                      ) : (
                        sharedHistory.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3 text-xs">{item.timestamp}</td>
                            <td className="px-4 py-3 text-sm font-medium">{item.username}</td>
                            <td className="px-4 py-3 text-sm">{item.sampleName}</td>
                            <td className="px-4 py-3 text-sm">{item.isotope}</td>
                            <td className="px-4 py-3 text-sm">{item.activity.toExponential(2)}</td>
                            <td className="px-4 py-3 text-sm">{item.density.toFixed(4)}</td>
                            <td className="px-4 py-3 text-sm">{item.targetActivity.toExponential(2)}</td>
                            <td className="px-4 py-3 text-sm">{item.targetDensity.toFixed(4)}</td>
                            <td className="px-4 py-3">
                              {item.username === currentUser.username && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => deleteHistoryEntry(item.id, true)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}