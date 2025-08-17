class FitTracker {
  constructor() {
    this.data = this.loadData();
    this.photoViewer = {
      currentIndex: 0,
      isPlaying: false,
      playInterval: null,
      speed: 1
    };
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.updateCurrentDate();
    this.updateDashboard();
    this.renderFoodHistory();
    this.setupTabs();
  }

  loadData() {
    const defaultData = {
      foods: [],
      weights: [],
      photos: [],
      targets: {
        calories: 2000,
        weight: 65,
        protein: 120,
        fat: 65,
        carbs: 250
      }
    };
    
    const saved = localStorage.getItem('fitTrackerData');
    return saved ? JSON.parse(saved) : defaultData;
  }

  saveData() {
    localStorage.setItem('fitTrackerData', JSON.stringify(this.data));
  }

  setupEventListeners() {
    document.getElementById('simpleFoodForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addSimpleFood();
    });

    document.getElementById('detailFoodForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addDetailFood();
    });

    document.getElementById('detailModeToggle').addEventListener('change', (e) => {
      this.toggleFoodMode(e.target.checked);
    });

    document.getElementById('historySearch').addEventListener('input', (e) => {
      this.searchHistory(e.target.value);
    });

    document.getElementById('weightForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.addWeight();
    });

    document.getElementById('captureBtn').addEventListener('click', () => {
      this.capturePhoto();
    });

    document.getElementById('photoInput').addEventListener('change', (e) => {
      this.handlePhotoUpload(e);
    });

    document.getElementById('playBtn').addEventListener('click', () => {
      this.startSlideshow();
    });

    document.getElementById('pauseBtn').addEventListener('click', () => {
      this.pauseSlideshow();
    });

    document.getElementById('stopBtn').addEventListener('click', () => {
      this.stopSlideshow();
    });

    document.getElementById('prevBtn').addEventListener('click', () => {
      this.previousPhoto();
    });

    document.getElementById('nextBtn').addEventListener('click', () => {
      this.nextPhoto();
    });

    document.getElementById('speedSlider').addEventListener('input', (e) => {
      this.updateSpeed(parseFloat(e.target.value));
    });

    document.getElementById('progressSlider').addEventListener('input', (e) => {
      this.goToPhotoByProgress(parseInt(e.target.value));
    });
  }

  setupTabs() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;
        
        navBtns.forEach(b => b.classList.remove('active'));
        tabContents.forEach(t => t.classList.remove('active'));
        
        btn.classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'weight') {
          this.renderWeightChart();
        } else if (tabName === 'stats') {
          this.renderPFCChart();
          this.updateStats();
        } else if (tabName === 'photo') {
          this.renderPhotos();
          this.initPhotoViewer();
        } else if (tabName === 'food') {
          this.renderHistoryItems();
        }
      });
    });
  }

  updateCurrentDate() {
    const now = new Date();
    const options = { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    };
    document.getElementById('currentDate').textContent = 
      now.toLocaleDateString('ja-JP', options);
  }

  calculatePFC(food) {
    const multiplier = food.weight / 100;
    return {
      protein: food.proteinPer100 * multiplier,
      fat: food.fatPer100 * multiplier,
      carbs: food.carbsPer100 * multiplier,
      calories: (food.proteinPer100 * 4 + food.fatPer100 * 9 + food.carbsPer100 * 4) * multiplier
    };
  }

  toggleFoodMode(isDetailMode) {
    const simpleForm = document.querySelector('.simple-form');
    const detailForm = document.querySelector('.detail-form');
    
    if (isDetailMode) {
      simpleForm.style.display = 'none';
      detailForm.style.display = 'block';
    } else {
      simpleForm.style.display = 'block';
      detailForm.style.display = 'none';
    }
  }

  addSimpleFood() {
    const form = document.getElementById('simpleFoodForm');
    const food = {
      id: Date.now(),
      type: 'simple',
      name: document.getElementById('simpleFoodName').value,
      calories: parseFloat(document.getElementById('simpleCalories').value),
      memo: document.getElementById('simpleMemo').value,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };

    this.data.foods.push(food);
    this.saveData();
    
    form.reset();
    this.updateDashboard();
    this.renderFoodHistory();
    this.renderHistoryItems();
  }

  addDetailFood() {
    const form = document.getElementById('detailFoodForm');
    
    const food = {
      id: Date.now(),
      type: 'detail',
      name: document.getElementById('detailFoodName').value,
      weight: parseFloat(document.getElementById('foodWeight').value),
      proteinPer100: parseFloat(document.getElementById('proteinPer100').value),
      fatPer100: parseFloat(document.getElementById('fatPer100').value),
      carbsPer100: parseFloat(document.getElementById('carbsPer100').value),
      memo: document.getElementById('detailMemo').value,
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString()
    };

    this.data.foods.push(food);
    this.saveData();
    
    form.reset();
    this.updateDashboard();
    this.renderFoodHistory();
    this.renderHistoryItems();
  }

  addWeight() {
    const weightInput = document.getElementById('weightInput');
    const weight = parseFloat(weightInput.value);
    
    if (weight > 0) {
      this.data.weights.push({
        id: Date.now(),
        weight: weight,
        date: new Date().toISOString().split('T')[0],
        timestamp: new Date().toISOString()
      });
      
      this.saveData();
      weightInput.value = '';
      this.updateDashboard();
      this.renderWeightChart();
    }
  }

  getTodaysFoods() {
    const today = new Date().toISOString().split('T')[0];
    return this.data.foods.filter(food => food.date === today);
  }

  getTodaysPFC() {
    const todaysFoods = this.getTodaysFoods();
    return todaysFoods.reduce((total, food) => {
      if (food.type === 'simple') {
        return {
          protein: total.protein,
          fat: total.fat,
          carbs: total.carbs,
          calories: total.calories + food.calories
        };
      } else {
        const pfc = this.calculatePFC(food);
        return {
          protein: total.protein + pfc.protein,
          fat: total.fat + pfc.fat,
          carbs: total.carbs + pfc.carbs,
          calories: total.calories + pfc.calories
        };
      }
    }, { protein: 0, fat: 0, carbs: 0, calories: 0 });
  }

  getCurrentWeight() {
    if (this.data.weights.length === 0) return null;
    return this.data.weights[this.data.weights.length - 1].weight;
  }

  updateDashboard() {
    const todaysPFC = this.getTodaysPFC();
    const currentWeight = this.getCurrentWeight();
    
    document.getElementById('todayCalories').textContent = Math.round(todaysPFC.calories);
    document.getElementById('targetCalories').textContent = this.data.targets.calories;
    document.getElementById('currentWeight').textContent = currentWeight ? `${currentWeight} kg` : '-';
    document.getElementById('targetWeight').textContent = this.data.targets.weight;
    
    document.getElementById('proteinValue').textContent = `${Math.round(todaysPFC.protein)}g`;
    document.getElementById('fatValue').textContent = `${Math.round(todaysPFC.fat)}g`;
    document.getElementById('carbsValue').textContent = `${Math.round(todaysPFC.carbs)}g`;
    
    const proteinPercent = Math.min((todaysPFC.protein / this.data.targets.protein) * 100, 100);
    const fatPercent = Math.min((todaysPFC.fat / this.data.targets.fat) * 100, 100);
    const carbsPercent = Math.min((todaysPFC.carbs / this.data.targets.carbs) * 100, 100);
    
    document.getElementById('proteinBar').style.width = `${proteinPercent}%`;
    document.getElementById('fatBar').style.width = `${fatPercent}%`;
    document.getElementById('carbsBar').style.width = `${carbsPercent}%`;
  }

  renderFoodHistory() {
    const historyDiv = document.getElementById('foodHistory');
    const todaysFoods = this.getTodaysFoods();
    
    if (todaysFoods.length === 0) {
      historyDiv.innerHTML = '<p style="text-align: center; color: #999;">まだ食事が記録されていません</p>';
      return;
    }
    
    historyDiv.innerHTML = todaysFoods.map(food => {
      if (food.type === 'simple') {
        return `
          <div class="food-item" data-id="${food.id}">
            <div class="food-info">
              <h4>${food.name}</h4>
              <div class="details">
                ${food.memo ? food.memo : '簡易記録'}
              </div>
            </div>
            <div class="food-calories">${food.calories} kcal</div>
            <button class="edit-btn" onclick="fitTracker.editFood(${food.id})">編集</button>
          </div>
        `;
      } else {
        const pfc = this.calculatePFC(food);
        return `
          <div class="food-item" data-id="${food.id}">
            <div class="food-info">
              <h4>${food.name}</h4>
              <div class="details">
                ${food.weight}g | P:${Math.round(pfc.protein)}g F:${Math.round(pfc.fat)}g C:${Math.round(pfc.carbs)}g
                ${food.memo ? `| ${food.memo}` : ''}
              </div>
            </div>
            <div class="food-calories">${Math.round(pfc.calories)} kcal</div>
            <button class="edit-btn" onclick="fitTracker.editFood(${food.id})">編集</button>
          </div>
        `;
      }
    }).join('');
  }

  renderHistoryItems() {
    const historyItemsDiv = document.getElementById('historyItems');
    const uniqueFoods = this.getUniqueFoods();
    
    if (uniqueFoods.length === 0) {
      historyItemsDiv.innerHTML = '<p style="text-align: center; color: #999;">履歴がありません</p>';
      return;
    }
    
    historyItemsDiv.innerHTML = uniqueFoods.map(food => `
      <div class="history-item" onclick="fitTracker.selectFromHistory('${food.id}')">
        <h4>${food.name}</h4>
        <div class="details">
          ${food.type === 'simple' ? 
            `${food.calories} kcal ${food.memo ? '| ' + food.memo : ''}` :
            `${food.weight}g | ${Math.round(this.calculatePFC(food).calories)} kcal`
          }
        </div>
      </div>
    `).join('');
  }

  getUniqueFoods() {
    const foodMap = new Map();
    this.data.foods.forEach(food => {
      const key = `${food.name}_${food.type}`;
      if (!foodMap.has(key) || new Date(food.timestamp) > new Date(foodMap.get(key).timestamp)) {
        foodMap.set(key, food);
      }
    });
    return Array.from(foodMap.values()).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  searchHistory(searchTerm) {
    const historyItemsDiv = document.getElementById('historyItems');
    const uniqueFoods = this.getUniqueFoods();
    
    const filteredFoods = uniqueFoods.filter(food => 
      food.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (food.memo && food.memo.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    
    if (filteredFoods.length === 0) {
      historyItemsDiv.innerHTML = '<p style="text-align: center; color: #999;">該当する履歴がありません</p>';
      return;
    }
    
    historyItemsDiv.innerHTML = filteredFoods.map(food => `
      <div class="history-item" onclick="fitTracker.selectFromHistory('${food.id}')">
        <h4>${food.name}</h4>
        <div class="details">
          ${food.type === 'simple' ? 
            `${food.calories} kcal ${food.memo ? '| ' + food.memo : ''}` :
            `${food.weight}g | ${Math.round(this.calculatePFC(food).calories)} kcal`
          }
        </div>
      </div>
    `).join('');
  }

  selectFromHistory(foodId) {
    const food = this.data.foods.find(f => f.id == foodId);
    if (!food) return;
    
    if (food.type === 'simple') {
      document.getElementById('simpleFoodName').value = food.name;
      document.getElementById('simpleCalories').value = food.calories;
      document.getElementById('simpleMemo').value = food.memo || '';
      
      document.getElementById('detailModeToggle').checked = false;
      this.toggleFoodMode(false);
    } else {
      document.getElementById('detailFoodName').value = food.name;
      document.getElementById('foodWeight').value = food.weight;
      document.getElementById('proteinPer100').value = food.proteinPer100;
      document.getElementById('fatPer100').value = food.fatPer100;
      document.getElementById('carbsPer100').value = food.carbsPer100;
      document.getElementById('detailMemo').value = food.memo || '';
      
      document.getElementById('detailModeToggle').checked = true;
      this.toggleFoodMode(true);
    }
  }

  editFood(foodId) {
    const food = this.data.foods.find(f => f.id === foodId);
    if (!food) return;
    
    if (confirm(`「${food.name}」を編集しますか？`)) {
      this.selectFromHistory(foodId);
      this.data.foods = this.data.foods.filter(f => f.id !== foodId);
      this.saveData();
      this.updateDashboard();
      this.renderFoodHistory();
      this.renderHistoryItems();
    }
  }

  renderWeightChart() {
    const canvas = document.getElementById('weightChart');
    const ctx = canvas.getContext('2d');
    
    if (this.weightChart) {
      this.weightChart.destroy();
    }
    
    const last30Days = this.data.weights.slice(-30);
    const labels = last30Days.map(w => new Date(w.date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }));
    const weights = last30Days.map(w => w.weight);
    
    this.weightChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: '体重 (kg)',
          data: weights,
          borderColor: '#4CAF50',
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: false,
            ticks: {
              callback: function(value) {
                return value + ' kg';
              }
            }
          }
        }
      }
    });
  }

  renderPFCChart() {
    const canvas = document.getElementById('pfcChart');
    const ctx = canvas.getContext('2d');
    
    if (this.pfcChart) {
      this.pfcChart.destroy();
    }
    
    const weeklyPFC = this.getWeeklyAveragePFC();
    
    this.pfcChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['タンパク質', '脂質', '炭水化物'],
        datasets: [{
          data: [weeklyPFC.protein * 4, weeklyPFC.fat * 9, weeklyPFC.carbs * 4],
          backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  getWeeklyAveragePFC() {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weeklyFoods = this.data.foods.filter(food => 
      new Date(food.date) >= weekAgo
    );
    
    if (weeklyFoods.length === 0) {
      return { protein: 0, fat: 0, carbs: 0, calories: 0 };
    }
    
    const total = weeklyFoods.reduce((sum, food) => {
      const pfc = this.calculatePFC(food);
      return {
        protein: sum.protein + pfc.protein,
        fat: sum.fat + pfc.fat,
        carbs: sum.carbs + pfc.carbs,
        calories: sum.calories + pfc.calories
      };
    }, { protein: 0, fat: 0, carbs: 0, calories: 0 });
    
    const days = 7;
    return {
      protein: total.protein / days,
      fat: total.fat / days,
      carbs: total.carbs / days,
      calories: total.calories / days
    };
  }

  updateStats() {
    const weeklyAvg = this.getWeeklyAveragePFC();
    document.getElementById('weeklyCalories').textContent = Math.round(weeklyAvg.calories);
    
    const weightChange = this.getWeightChange();
    document.getElementById('weightChange').textContent = `${weightChange >= 0 ? '+' : ''}${weightChange} kg`;
  }

  getWeightChange() {
    if (this.data.weights.length < 2) return 0;
    
    const latest = this.data.weights[this.data.weights.length - 1].weight;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const oldWeights = this.data.weights.filter(w => new Date(w.date) <= weekAgo);
    if (oldWeights.length === 0) return 0;
    
    const oldWeight = oldWeights[oldWeights.length - 1].weight;
    return Math.round((latest - oldWeight) * 10) / 10;
  }

  async capturePhoto() {
    if ('mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'user' }
        });
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();
        
        video.addEventListener('loadedmetadata', () => {
          const canvas = document.createElement('canvas');
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(video, 0, 0);
          
          const imageData = canvas.toDataURL('image/jpeg', 0.7);
          
          this.data.photos.push({
            id: Date.now(),
            image: imageData,
            date: new Date().toISOString().split('T')[0],
            timestamp: new Date().toISOString()
          });
          
          this.saveData();
          this.renderPhotos();
          this.initPhotoViewer();
          
          stream.getTracks().forEach(track => track.stop());
        });
      } catch (error) {
        console.error('カメラアクセスエラー:', error);
        document.getElementById('photoInput').click();
      }
    } else {
      document.getElementById('photoInput').click();
    }
  }

  handlePhotoUpload(event) {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.data.photos.push({
          id: Date.now(),
          image: e.target.result,
          date: new Date().toISOString().split('T')[0],
          timestamp: new Date().toISOString()
        });
        
        this.saveData();
        this.renderPhotos();
        this.initPhotoViewer();
      };
      reader.readAsDataURL(file);
    }
  }

  renderPhotos() {
    const photosDiv = document.getElementById('photos');
    
    if (this.data.photos.length === 0) {
      photosDiv.innerHTML = '<p style="text-align: center; color: #999;">まだ写真が記録されていません</p>';
      return;
    }
    
    photosDiv.innerHTML = this.data.photos
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .map((photo, index) => `
        <div class="photo-item" onclick="fitTracker.selectPhoto(${index})">
          <img src="${photo.image}" alt="進捗写真">
          <div class="photo-date">${new Date(photo.date).toLocaleDateString('ja-JP')}</div>
        </div>
      `).join('');
  }

  initPhotoViewer() {
    if (this.data.photos.length === 0) {
      this.showNoPhotosMessage();
      return;
    }
    
    this.photoViewer.currentIndex = 0;
    this.updatePhotoViewer();
    this.updateProgressSlider();
  }

  showNoPhotosMessage() {
    document.getElementById('mainPhoto').style.display = 'none';
    document.getElementById('noPhotoMessage').style.display = 'block';
    document.getElementById('photoDate').textContent = '-';
    document.getElementById('photoProgress').textContent = '- / -';
    document.getElementById('progressSlider').disabled = true;
  }

  updatePhotoViewer() {
    const sortedPhotos = this.getSortedPhotos();
    
    if (sortedPhotos.length === 0) {
      this.showNoPhotosMessage();
      return;
    }
    
    const currentPhoto = sortedPhotos[this.photoViewer.currentIndex];
    
    document.getElementById('mainPhoto').src = currentPhoto.image;
    document.getElementById('mainPhoto').style.display = 'block';
    document.getElementById('noPhotoMessage').style.display = 'none';
    document.getElementById('photoDate').textContent = new Date(currentPhoto.date).toLocaleDateString('ja-JP');
    document.getElementById('photoProgress').textContent = `${this.photoViewer.currentIndex + 1} / ${sortedPhotos.length}`;
    document.getElementById('progressSlider').disabled = false;
    
    this.updateProgressSlider();
  }

  getSortedPhotos() {
    return [...this.data.photos].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  updateProgressSlider() {
    const sortedPhotos = this.getSortedPhotos();
    if (sortedPhotos.length > 0) {
      const progress = sortedPhotos.length > 1 ? 
        (this.photoViewer.currentIndex / (sortedPhotos.length - 1)) * 100 : 0;
      document.getElementById('progressSlider').value = progress;
    }
  }

  selectPhoto(index) {
    this.photoViewer.currentIndex = index;
    this.updatePhotoViewer();
    
    if (this.photoViewer.isPlaying) {
      this.pauseSlideshow();
    }
  }

  startSlideshow() {
    if (this.data.photos.length <= 1) return;
    
    this.photoViewer.isPlaying = true;
    document.getElementById('playBtn').style.display = 'none';
    document.getElementById('pauseBtn').style.display = 'inline-flex';
    
    const interval = 2000 / this.photoViewer.speed;
    
    this.photoViewer.playInterval = setInterval(() => {
      this.nextPhoto();
    }, interval);
  }

  pauseSlideshow() {
    this.photoViewer.isPlaying = false;
    document.getElementById('playBtn').style.display = 'inline-flex';
    document.getElementById('pauseBtn').style.display = 'none';
    
    if (this.photoViewer.playInterval) {
      clearInterval(this.photoViewer.playInterval);
      this.photoViewer.playInterval = null;
    }
  }

  stopSlideshow() {
    this.pauseSlideshow();
    this.photoViewer.currentIndex = 0;
    this.updatePhotoViewer();
  }

  nextPhoto() {
    const sortedPhotos = this.getSortedPhotos();
    if (sortedPhotos.length === 0) return;
    
    this.photoViewer.currentIndex = (this.photoViewer.currentIndex + 1) % sortedPhotos.length;
    this.updatePhotoViewer();
  }

  previousPhoto() {
    const sortedPhotos = this.getSortedPhotos();
    if (sortedPhotos.length === 0) return;
    
    this.photoViewer.currentIndex = this.photoViewer.currentIndex === 0 ? 
      sortedPhotos.length - 1 : this.photoViewer.currentIndex - 1;
    this.updatePhotoViewer();
  }

  updateSpeed(speed) {
    this.photoViewer.speed = speed;
    document.getElementById('speedValue').textContent = `${speed}x`;
    
    if (this.photoViewer.isPlaying) {
      this.pauseSlideshow();
      this.startSlideshow();
    }
  }

  goToPhotoByProgress(progress) {
    const sortedPhotos = this.getSortedPhotos();
    if (sortedPhotos.length === 0) return;
    
    if (this.photoViewer.isPlaying) {
      this.pauseSlideshow();
    }
    
    const index = sortedPhotos.length > 1 ? 
      Math.round((progress / 100) * (sortedPhotos.length - 1)) : 0;
    
    this.photoViewer.currentIndex = Math.max(0, Math.min(index, sortedPhotos.length - 1));
    this.updatePhotoViewer();
  }
}

let fitTracker;

document.addEventListener('DOMContentLoaded', () => {
  fitTracker = new FitTracker();
});