import serial
import serial.tools.list_ports
import tkinter as tk
from tkinter import ttk, messagebox
import matplotlib.pyplot as plt
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg
from matplotlib.figure import Figure
import numpy as np
import time
from threading import Thread, Lock

class ESP32Oscilloscope:
    def __init__(self, root):
        self.root = root
        self.root.title("ESP32 Digital Oscilloscope & Function Generator")
        self.root.geometry("1600x900")
        self.root.configure(bg='#000000')
        
        # Serial connection
        self.ser = None
        self.connected = False
        self.demo_mode = False
        self.data_lock = Lock()
        self.running = False
        self.auto_capture = False
        
        # Data storage
        self.scope_data = {'time': [], 'voltage': []}
        
        # Generator settings
        self.gen_active = False
        
        # Create professional UI
        self.create_ui()
        
        # Check for connection
        self.check_startup()
        
    def create_ui(self):
        """Create oscilloscope-style interface"""
        # Top bar - Status and branding
        top_bar = tk.Frame(self.root, bg='#1a1a1a', height=50)
        top_bar.pack(fill=tk.X, side=tk.TOP)
        
        tk.Label(top_bar, text="ESP32 DIGITAL OSCILLOSCOPE", 
                bg='#1a1a1a', fg='#00ff00', 
                font=('Courier New', 16, 'bold')).pack(side=tk.LEFT, padx=20, pady=10)
        
        self.status_indicator = tk.Label(top_bar, text="●", 
                                         bg='#1a1a1a', fg='#ff0000', 
                                         font=('Arial', 24))
        self.status_indicator.pack(side=tk.RIGHT, padx=20)
        
        self.status_text = tk.Label(top_bar, text="DISCONNECTED", 
                                    bg='#1a1a1a', fg='#ff0000', 
                                    font=('Courier New', 10, 'bold'))
        self.status_text.pack(side=tk.RIGHT, padx=5)
        
        # Main container
        main_container = tk.Frame(self.root, bg='#000000')
        main_container.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Left panel - Controls
        left_panel = tk.Frame(main_container, bg='#0a0a0a', width=350)
        left_panel.pack(side=tk.LEFT, fill=tk.Y, padx=5, pady=5)
        left_panel.pack_propagate(False)
        
        self.create_connection_panel(left_panel)
        self.create_function_generator_panel(left_panel)
        self.create_scope_controls_panel(left_panel)
        
        # Right side - Display area
        right_panel = tk.Frame(main_container, bg='#0a0a0a')
        right_panel.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.create_display_panel(right_panel)
        self.create_measurements_panel(right_panel)
        
    def create_connection_panel(self, parent):
        """Connection control panel"""
        frame = tk.LabelFrame(parent, text="║ CONNECTION ║", bg='#0a0a0a', 
                             fg='#00ff00', font=('Courier New', 11, 'bold'),
                             bd=2, relief=tk.GROOVE)
        frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Port selection
        port_frame = tk.Frame(frame, bg='#0a0a0a')
        port_frame.pack(fill=tk.X, padx=10, pady=5)
        
        tk.Label(port_frame, text="PORT:", bg='#0a0a0a', fg='#888888',
                font=('Courier New', 9)).pack(side=tk.LEFT, padx=5)
        
        self.port_var = tk.StringVar()
        self.port_combo = ttk.Combobox(port_frame, textvariable=self.port_var,
                                       state='readonly', width=20,
                                       font=('Courier New', 9))
        self.port_combo.pack(side=tk.LEFT, padx=5)
        self.refresh_ports()
        
        # Control buttons
        btn_frame = tk.Frame(frame, bg='#0a0a0a')
        btn_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.connect_btn = tk.Button(btn_frame, text="CONNECT",
                                     command=self.toggle_connection,
                                     bg='#004400', fg='#00ff00',
                                     font=('Courier New', 10, 'bold'),
                                     activebackground='#006600',
                                     relief=tk.RAISED, bd=3, width=15)
        self.connect_btn.pack(side=tk.LEFT, padx=2, pady=5)
        
        refresh_btn = tk.Button(btn_frame, text="REFRESH",
                               command=self.refresh_ports,
                               bg='#1a3a5a', fg='#00aaff',
                               font=('Courier New', 10, 'bold'),
                               activebackground='#2a4a6a',
                               relief=tk.RAISED, bd=3, width=15)
        refresh_btn.pack(side=tk.LEFT, padx=2, pady=5)
        
        # Demo mode button
        self.demo_btn = tk.Button(frame, text="DEMO MODE",
                                 command=self.toggle_demo_mode,
                                 bg='#3a1a5a', fg='#ff00ff',
                                 font=('Courier New', 10, 'bold'),
                                 activebackground='#4a2a6a',
                                 relief=tk.RAISED, bd=3)
        self.demo_btn.pack(fill=tk.X, padx=10, pady=5)
        
    def create_function_generator_panel(self, parent):
        """Function generator controls"""
        frame = tk.LabelFrame(parent, text="║ FUNCTION GENERATOR ║", 
                             bg='#0a0a0a', fg='#ffaa00',
                             font=('Courier New', 11, 'bold'),
                             bd=2, relief=tk.GROOVE)
        frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Waveform selection
        wave_frame = tk.LabelFrame(frame, text="WAVEFORM", bg='#0a0a0a',
                                  fg='#888888', font=('Courier New', 9))
        wave_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.wave_var = tk.StringVar(value="SINE")
        
        waves = [
            ("SINE", "SINE", "#00ff00"),
            ("SQUARE", "SQUARE", "#00ffff"),
            ("TRIANGLE", "TRIANGLE", "#ffff00"),
            ("SAWTOOTH", "SAWTOOTH", "#ff8800")
        ]
        
        for text, value, color in waves:
            rb = tk.Radiobutton(wave_frame, text=text, variable=self.wave_var,
                               value=value, bg='#0a0a0a', fg=color,
                               selectcolor='#1a1a1a', activebackground='#0a0a0a',
                               font=('Courier New', 9, 'bold'),
                               command=self.update_waveform)
            rb.pack(anchor=tk.W, padx=10, pady=2)
        
        # Frequency control
        freq_frame = tk.LabelFrame(frame, text="FREQUENCY (Hz)", bg='#0a0a0a',
                                  fg='#888888', font=('Courier New', 9))
        freq_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.freq_var = tk.IntVar(value=1000)
        
        # Manual entry box with validation
        freq_entry_frame = tk.Frame(freq_frame, bg='#0a0a0a')
        freq_entry_frame.pack(padx=10, pady=5)
        
        tk.Label(freq_entry_frame, text="Enter:", bg='#0a0a0a', fg='#888888',
                font=('Courier New', 9)).pack(side=tk.LEFT, padx=5)
        
        self.freq_entry = tk.Entry(freq_entry_frame, textvariable=self.freq_var,
                                   bg='#000000', fg='#00ff00',
                                   font=('Courier New', 14, 'bold'),
                                   width=10, justify=tk.CENTER,
                                   insertbackground='#00ff00')
        self.freq_entry.pack(side=tk.LEFT, padx=5)
        self.freq_entry.bind('<Return>', self.validate_and_update_freq)
        self.freq_entry.bind('<FocusOut>', self.validate_and_update_freq)
        # Add KeyRelease for real-time validation
        self.freq_entry.bind('<KeyRelease>', self.on_freq_key_release)
        
        tk.Label(freq_entry_frame, text="Hz", bg='#0a0a0a', fg='#00ff00',
                font=('Courier New', 10, 'bold')).pack(side=tk.LEFT, padx=5)
        
        # Add SET button for manual entry
        set_freq_btn = tk.Button(freq_entry_frame, text="SET",
                                command=self.validate_and_update_freq,
                                bg='#004400', fg='#00ff00',
                                font=('Courier New', 9, 'bold'),
                                activebackground='#006600',
                                relief=tk.RAISED, bd=2, width=5)
        set_freq_btn.pack(side=tk.LEFT, padx=5)
        
        self.freq_scale = tk.Scale(freq_frame, from_=1, to=50000,
                                   orient=tk.HORIZONTAL, variable=self.freq_var,
                                   bg='#1a1a1a', fg='#00ff00',
                                   troughcolor='#000000', highlightthickness=0,
                                   command=self.update_frequency_from_slider, showvalue=0)
        self.freq_scale.pack(fill=tk.X, padx=10, pady=5)
        
        # Quick frequency buttons
        quick_freq = tk.Frame(freq_frame, bg='#0a0a0a')
        quick_freq.pack(fill=tk.X, padx=10, pady=5)
        
        for freq in [100, 500, 1000, 5000]:
            btn = tk.Button(quick_freq, text=f"{freq}Hz",
                           command=lambda f=freq: self.set_frequency(f),
                           bg='#1a1a1a', fg='#888888',
                           font=('Courier New', 7), width=6,
                           activebackground='#2a2a2a')
            btn.pack(side=tk.LEFT, padx=2)
        
        # Amplitude control
        amp_frame = tk.LabelFrame(frame, text="AMPLITUDE (0-255)", bg='#0a0a0a',
                                 fg='#888888', font=('Courier New', 9))
        amp_frame.pack(fill=tk.X, padx=10, pady=5)
        
        self.amp_var = tk.IntVar(value=200)
        
        # Manual entry box with validation
        amp_entry_frame = tk.Frame(amp_frame, bg='#0a0a0a')
        amp_entry_frame.pack(padx=10, pady=5)
        
        tk.Label(amp_entry_frame, text="Enter:", bg='#0a0a0a', fg='#888888',
                font=('Courier New', 9)).pack(side=tk.LEFT, padx=5)
        
        self.amp_entry = tk.Entry(amp_entry_frame, textvariable=self.amp_var,
                                 bg='#000000', fg='#ffaa00',
                                 font=('Courier New', 14, 'bold'),
                                 width=10, justify=tk.CENTER,
                                 insertbackground='#ffaa00')
        self.amp_entry.pack(side=tk.LEFT, padx=5)
        self.amp_entry.bind('<Return>', self.validate_and_update_amp)
        self.amp_entry.bind('<FocusOut>', self.validate_and_update_amp)
        # Add KeyRelease for real-time validation
        self.amp_entry.bind('<KeyRelease>', self.on_amp_key_release)
        
        # Add SET button for manual entry
        set_amp_btn = tk.Button(amp_entry_frame, text="SET",
                               command=self.validate_and_update_amp,
                               bg='#443300', fg='#ffaa00',
                               font=('Courier New', 9, 'bold'),
                               activebackground='#665500',
                               relief=tk.RAISED, bd=2, width=5)
        set_amp_btn.pack(side=tk.LEFT, padx=5)
        
        self.amp_scale = tk.Scale(amp_frame, from_=0, to=255,
                                 orient=tk.HORIZONTAL, variable=self.amp_var,
                                 bg='#1a1a1a', fg='#ffaa00',
                                 troughcolor='#000000', highlightthickness=0,
                                 command=self.update_amplitude_from_slider, showvalue=0)
        self.amp_scale.pack(fill=tk.X, padx=10, pady=5)
        
        # Generator ON/OFF
        self.gen_btn = tk.Button(frame, text="OUTPUT: OFF",
                                command=self.toggle_generator,
                                bg='#440000', fg='#ff0000',
                                font=('Courier New', 12, 'bold'),
                                activebackground='#660000',
                                relief=tk.RAISED, bd=4, height=2)
        self.gen_btn.pack(fill=tk.X, padx=10, pady=10)
        
    def create_scope_controls_panel(self, parent):
        """Oscilloscope control panel"""
        frame = tk.LabelFrame(parent, text="║ OSCILLOSCOPE CONTROLS ║",
                             bg='#0a0a0a', fg='#00ffff',
                             font=('Courier New', 11, 'bold'),
                             bd=2, relief=tk.GROOVE)
        frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Single capture
        single_btn = tk.Button(frame, text="◉ SINGLE",
                              command=self.capture_single,
                              bg='#1a3a5a', fg='#00aaff',
                              font=('Courier New', 11, 'bold'),
                              activebackground='#2a4a6a',
                              relief=tk.RAISED, bd=3, height=2)
        single_btn.pack(fill=tk.X, padx=10, pady=5)
        
        # Auto/Run
        self.run_btn = tk.Button(frame, text="▶ RUN",
                                command=self.toggle_run,
                                bg='#004400', fg='#00ff00',
                                font=('Courier New', 11, 'bold'),
                                activebackground='#006600',
                                relief=tk.RAISED, bd=3, height=2)
        self.run_btn.pack(fill=tk.X, padx=10, pady=5)
        
        # Clear
        clear_btn = tk.Button(frame, text="⌧ CLEAR",
                             command=self.clear_display,
                             bg='#440000', fg='#ff4444',
                             font=('Courier New', 11, 'bold'),
                             activebackground='#660000',
                             relief=tk.RAISED, bd=3, height=2)
        clear_btn.pack(fill=tk.X, padx=10, pady=5)
        
    def create_display_panel(self, parent):
        """Main oscilloscope display"""
        display_frame = tk.Frame(parent, bg='#0a0a0a', relief=tk.SUNKEN, bd=3)
        display_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        # Display header
        header = tk.Frame(display_frame, bg='#000000')
        header.pack(fill=tk.X)
        
        self.mode_label = tk.Label(header, text="[ DISCONNECTED ]",
                                   bg='#000000', fg='#ff0000',
                                   font=('Courier New', 12, 'bold'))
        self.mode_label.pack(pady=5)
        
        # Create matplotlib figure with oscilloscope styling
        self.fig = Figure(figsize=(11, 6), facecolor='#000000')
        self.ax = self.fig.add_subplot(111, facecolor='#001a00')
        
        # Oscilloscope grid styling
        self.ax.set_xlabel('Time (ms)', color='#00ff00', fontsize=11, 
                          fontfamily='monospace', fontweight='bold')
        self.ax.set_ylabel('Voltage (V)', color='#00ff00', fontsize=11,
                          fontfamily='monospace', fontweight='bold')
        self.ax.tick_params(colors='#00aa00', labelsize=9, width=2)
        
        # Major and minor grid like real oscilloscope
        self.ax.grid(True, which='major', alpha=0.4, color='#00ff00', linewidth=1.5)
        self.ax.grid(True, which='minor', alpha=0.2, color='#00ff00', linewidth=0.5)
        self.ax.minorticks_on()
        
        self.ax.set_xlim(0, 100)
        self.ax.set_ylim(0, 6.6)
        
        # Waveform trace - bright green like CRT
        self.line, = self.ax.plot([], [], color='#00ff00', linewidth=2.5, 
                                  antialiased=True, linestyle='-')
        
        # Embed canvas
        self.canvas = FigureCanvasTkAgg(self.fig, display_frame)
        self.canvas.get_tk_widget().pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        self.fig.tight_layout()
        
    def create_measurements_panel(self, parent):
        """Measurement display panel"""
        frame = tk.Frame(parent, bg='#0a0a0a', relief=tk.SUNKEN, bd=3)
        frame.pack(fill=tk.X, padx=5, pady=5)
        
        tk.Label(frame, text="MEASUREMENTS", bg='#0a0a0a', fg='#00ffff',
                font=('Courier New', 11, 'bold')).pack(pady=5)
        
        # Measurement displays
        meas_container = tk.Frame(frame, bg='#0a0a0a')
        meas_container.pack(fill=tk.X, padx=10, pady=5)
        
        measurements = [
            ("Vmax", "vmax", "V"),
            ("Vmin", "vmin", "V"),
            ("Vpp", "vpp", "V"),
            ("Vavg", "vavg", "V"),
            ("Freq", "freq", "Hz")
        ]
        
        self.meas_labels = {}
        
        for i, (label, key, unit) in enumerate(measurements):
            meas_frame = tk.Frame(meas_container, bg='#000000', 
                                 relief=tk.SUNKEN, bd=2)
            meas_frame.pack(side=tk.LEFT, padx=5, pady=5, fill=tk.BOTH, expand=True)
            
            tk.Label(meas_frame, text=label, bg='#000000', fg='#888888',
                    font=('Courier New', 9)).pack()
            
            value_label = tk.Label(meas_frame, text="----", bg='#000000',
                                  fg='#00ff00', font=('DS-Digital', 16, 'bold'))
            value_label.pack()
            
            tk.Label(meas_frame, text=unit, bg='#000000', fg='#888888',
                    font=('Courier New', 8)).pack()
            
            self.meas_labels[key] = value_label
    
    def on_freq_key_release(self, event=None):
        """Handle key release in frequency entry - for Enter key"""
        if event and event.keysym == 'Return':
            self.validate_and_update_freq()
    
    def on_amp_key_release(self, event=None):
        """Handle key release in amplitude entry - for Enter key"""
        if event and event.keysym == 'Return':
            self.validate_and_update_amp()
    
    def validate_and_update_freq(self, event=None):
        """Validate and update frequency from manual entry"""
        try:
            freq = int(self.freq_var.get())
            if freq < 1:
                freq = 1
            elif freq > 50000:
                freq = 50000
            self.freq_var.set(freq)
            self.update_frequency()
            print(f"Frequency set to: {freq} Hz")  # Debug
        except ValueError:
            self.freq_var.set(1000)  # Reset to default
            messagebox.showerror("Invalid Input", "Frequency must be a number between 1 and 50000 Hz")
    
    def validate_and_update_amp(self, event=None):
        """Validate and update amplitude from manual entry"""
        try:
            amp = int(self.amp_var.get())
            if amp < 0:
                amp = 0
            elif amp > 255:
                amp = 255
            self.amp_var.set(amp)
            self.update_amplitude()
            print(f"Amplitude set to: {amp}")  # Debug
        except ValueError:
            self.amp_var.set(200)  # Reset to default
            messagebox.showerror("Invalid Input", "Amplitude must be a number between 0 and 255")
    
    def update_frequency_from_slider(self, value):
        """Update frequency from slider movement"""
        self.update_frequency()
    
    def update_amplitude_from_slider(self, value):
        """Update amplitude from slider movement"""
        self.update_amplitude()
    
    def set_frequency(self, freq):
        """Set frequency from quick buttons"""
        self.freq_var.set(freq)
        self.update_frequency()
        print(f"Quick frequency set to: {freq} Hz")  # Debug
    
    def update_frequency(self):
        """Send frequency update to ESP32"""
        freq = self.freq_var.get()
        self.send_command(f"FREQ:{freq}")
        print(f"Sending FREQ:{freq}")  # Debug
    
    def update_amplitude(self):
        """Send amplitude update to ESP32"""
        amp = self.amp_var.get()
        self.send_command(f"AMP:{amp}")
        print(f"Sending AMP:{amp}")  # Debug
            
    def check_startup(self):
        """Check connection on startup"""
        ports = serial.tools.list_ports.comports()
        esp_found = False
        
        for port in ports:
            if any(x in port.description for x in ['USB', 'Serial', 'CH340', 'CP210']):
                esp_found = True
                self.port_var.set(port.device)
                break
        
        if not esp_found:
            result = messagebox.askquestion(
                "ESP32 Not Found",
                "ESP32 device not detected.\n\n" +
                "Would you like to enable DEMO MODE?\n" +
                "(Demo mode allows you to explore all features with simulated data)",
                icon='question'
            )
            if result == 'yes':
                self.root.after(500, self.toggle_demo_mode)
        else:
            result = messagebox.askquestion(
                "ESP32 Detected",
                f"ESP32 found on {self.port_var.get()}\n\n" +
                "Connect now?",
                icon='question'
            )
            if result == 'yes':
                self.root.after(500, self.toggle_connection)
                
    def refresh_ports(self):
        """Refresh COM port list"""
        ports = [p.device for p in serial.tools.list_ports.comports()]
        self.port_combo['values'] = ports
        if ports:
            self.port_combo.current(0)
            
    def toggle_connection(self):
        """Toggle ESP32 connection"""
        if self.connected:
            self.disconnect()
        else:
            self.connect()
            
    def connect(self):
        """Connect to ESP32"""
        port = self.port_var.get()
        if not port:
            messagebox.showerror("Error", "Please select a COM port")
            return
            
        try:
            self.ser = serial.Serial(port, 115200, timeout=1)
            time.sleep(2)
            self.connected = True
            self.demo_mode = False
            
            # Update UI
            self.status_indicator.config(fg='#00ff00')
            self.status_text.config(text="CONNECTED", fg='#00ff00')
            self.mode_label.config(text="[ CONNECTED - READY ]", fg='#00ff00')
            self.connect_btn.config(text="DISCONNECT", bg='#440000', fg='#ff0000')
            self.demo_btn.config(state=tk.DISABLED)
            
            messagebox.showinfo("Success", f"Connected to ESP32 on {port}")
            
        except Exception as e:
            messagebox.showerror("Connection Error", f"Failed to connect:\n{str(e)}")
            
    def disconnect(self):
        """Disconnect from ESP32"""
        if self.running:
            self.toggle_run()
            
        if self.ser:
            self.ser.close()
            
        self.connected = False
        
        # Update UI
        self.status_indicator.config(fg='#ff0000')
        self.status_text.config(text="DISCONNECTED", fg='#ff0000')
        self.mode_label.config(text="[ DISCONNECTED ]", fg='#ff0000')
        self.connect_btn.config(text="CONNECT", bg='#004400', fg='#00ff00')
        self.demo_btn.config(state=tk.NORMAL)
        
    def toggle_demo_mode(self):
        """Toggle demo mode"""
        self.demo_mode = not self.demo_mode
        
        if self.demo_mode:
            self.status_indicator.config(fg='#ff00ff')
            self.status_text.config(text="DEMO MODE", fg='#ff00ff')
            self.mode_label.config(text="[ DEMO MODE - SIMULATED DATA ]", fg='#ff00ff')
            self.demo_btn.config(text="EXIT DEMO", bg='#440000', fg='#ff0000')
            self.connect_btn.config(state=tk.DISABLED)
            self.port_combo.config(state=tk.DISABLED)
            
            messagebox.showinfo("Demo Mode",
                "Demo mode activated!\n\n" +
                "All controls are functional with simulated waveforms.\n" +
                "Connect ESP32 hardware for real measurements.")
        else:
            self.status_indicator.config(fg='#ff0000')
            self.status_text.config(text="DISCONNECTED", fg='#ff0000')
            self.mode_label.config(text="[ DISCONNECTED ]", fg='#ff0000')
            self.demo_btn.config(text="DEMO MODE", bg='#3a1a5a', fg='#ff00ff')
            self.connect_btn.config(state=tk.NORMAL)
            self.port_combo.config(state='readonly')
            
    def send_command(self, command):
        """Send command to ESP32 or simulate in demo"""
        if self.demo_mode:
            print(f"[DEMO] Command: {command}")
            return  # Commands handled locally in demo mode
            
        if not self.connected or not self.ser:
            print(f"[NOT CONNECTED] Cannot send: {command}")
            return
            
        try:
            self.ser.write(f"{command}\n".encode())
            time.sleep(0.05)
            print(f"[SENT] {command}")
        except Exception as e:
            print(f"Command error: {e}")
            
    def update_waveform(self):
        """Update waveform type"""
        self.send_command(f"WAVE:{self.wave_var.get()}")
        
    def toggle_generator(self):
        """Toggle generator output"""
        self.gen_active = not self.gen_active
        
        if self.gen_active:
            self.send_command("GEN:ON")
            self.gen_btn.config(text="OUTPUT: ON", bg='#004400', fg='#00ff00')
        else:
            self.send_command("GEN:OFF")
            self.gen_btn.config(text="OUTPUT: OFF", bg='#440000', fg='#ff0000')
            
    def capture_single(self):
        """Single capture"""
        if not self.connected and not self.demo_mode:
            messagebox.showwarning("Warning", 
                "Not connected to ESP32.\n\nEnable Demo Mode to test with simulated data.")
            return
            
        if self.demo_mode:
            self.generate_demo_data()
        else:
            Thread(target=self._capture_thread, daemon=True).start()
            
    def generate_demo_data(self):
        """Generate simulated waveform"""
        samples = 1000
        time_data = np.linspace(0, 100, samples)
        
        freq = self.freq_var.get()
        amp = self.amp_var.get() / 255.0
        wave_type = self.wave_var.get()
        
        t = time_data / 1000.0
        
        if wave_type == "SINE":
            signal = np.sin(2 * np.pi * freq * t)
        elif wave_type == "SQUARE":
            signal = np.sign(np.sin(2 * np.pi * freq * t))
        elif wave_type == "TRIANGLE":
            signal = 2 * np.abs(2 * ((freq * t) % 1) - 1) - 1
        elif wave_type == "SAWTOOTH":
            signal = 2 * ((freq * t) % 1) - 1
        else:
            signal = np.zeros_like(t)
            
        voltage_data = 1.65 + amp * 1.5 * signal
        noise = np.random.normal(0, 0.015, samples)
        voltage_data = voltage_data + noise
        
        with self.data_lock:
            self.scope_data = {
                'time': time_data.tolist(),
                'voltage': voltage_data.tolist()
            }
            
        self.root.after(0, self.update_display)
        
    def _capture_thread(self):
        """Capture from ESP32"""
        try:
            self.ser.write(b"SCOPE\n")
            
            time_data = []
            voltage_data = []
            capturing = False
            
            timeout = time.time() + 5  # 5 second timeout
            
            while time.time() < timeout:
                if self.ser.in_waiting:
                    line = self.ser.readline().decode().strip()
                    
                    if line == "SCOPE_START":
                        capturing = True
                        time_data = []
                        voltage_data = []
                    elif line == "SCOPE_END":
                        break
                    elif capturing and ',' in line:
                        try:
                            t, v = line.split(',')
                            time_data.append(float(t) / 1000.0)
                            voltage_data.append(float(v))
                        except:
                            pass
                            
            with self.data_lock:
                self.scope_data = {
                    'time': time_data,
                    'voltage': voltage_data
                }
                
            self.root.after(0, self.update_display)
            
        except Exception as e:
            print(f"Capture error: {e}")
            
    def toggle_run(self):
        """Toggle continuous capture"""
        self.running = not self.running
        
        if self.running:
            self.run_btn.config(text="■ STOP", bg='#440000', fg='#ff0000')
            self.auto_capture = True
            Thread(target=self._run_thread, daemon=True).start()
        else:
            self.run_btn.config(text="▶ RUN", bg='#004400', fg='#00ff00')
            self.auto_capture = False
            
    def _run_thread(self):
        """Continuous capture thread"""
        while self.running and self.auto_capture:
            if self.demo_mode:
                self.generate_demo_data()
            else:
                if self.connected:
                    self._capture_thread()
            time.sleep(0.5)
            
    def update_display(self):
        """Update oscilloscope display"""
        with self.data_lock:
            time_data = self.scope_data['time']
            voltage_data = self.scope_data['voltage']
            
        if not time_data:
            return
            
        # Update waveform
        self.line.set_data(time_data, voltage_data)
        self.ax.set_xlim(min(time_data), max(time_data))
        self.canvas.draw()
        
        # Calculate measurements
        v_max = max(voltage_data)
        v_min = min(voltage_data)
        v_pp = v_max - v_min
        v_avg = np.mean(voltage_data)
        
        # Frequency estimation
        crossings = 0
        for i in range(1, len(voltage_data)):
            if voltage_data[i-1] < v_avg <= voltage_data[i]:
                crossings += 1
                
        duration = time_data[-1] - time_data[0]
        freq = (crossings / duration) * 1000 if duration > 0 else 0
        
        # Update measurement displays
        self.meas_labels['vmax'].config(text=f"{v_max:.3f}")
        self.meas_labels['vmin'].config(text=f"{v_min:.3f}")
        self.meas_labels['vpp'].config(text=f"{v_pp:.3f}")
        self.meas_labels['vavg'].config(text=f"{v_avg:.3f}")
        self.meas_labels['freq'].config(text=f"{freq:.1f}")
        
    def clear_display(self):
        """Clear display"""
        with self.data_lock:
            self.scope_data = {'time': [], 'voltage': []}
            
        self.line.set_data([], [])
        self.ax.set_xlim(0, 100)
        self.canvas.draw()
        
        for label in self.meas_labels.values():
            label.config(text="----")

def main():
    root = tk.Tk()
    app = ESP32Oscilloscope(root)
    root.mainloop()

if __name__ == "__main__":
    main()