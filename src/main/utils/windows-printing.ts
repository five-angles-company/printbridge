import edge from 'electron-edge-js'

// C# function for raw printing
const printRaw = edge.func(`
  using System;
  using System.Runtime.InteropServices;
  using System.Threading.Tasks;

  public class Startup {
      [DllImport("winspool.drv", CharSet = CharSet.Auto, SetLastError = true)]
      public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

      [DllImport("winspool.drv", SetLastError = true)]
      public static extern bool ClosePrinter(IntPtr hPrinter);

      [DllImport("winspool.drv", SetLastError = true)]
      public static extern int StartDocPrinter(IntPtr hPrinter, int Level, [In] ref DOC_INFO_1 pDocInfo);

      [DllImport("winspool.drv", SetLastError = true)]
      public static extern bool EndDocPrinter(IntPtr hPrinter);

      [DllImport("winspool.drv", SetLastError = true)]
      public static extern bool StartPagePrinter(IntPtr hPrinter);

      [DllImport("winspool.drv", SetLastError = true)]
      public static extern bool EndPagePrinter(IntPtr hPrinter);

      [DllImport("winspool.drv", SetLastError = true)]
      public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

      [StructLayout(LayoutKind.Sequential)]
      public struct DOC_INFO_1 {
          [MarshalAs(UnmanagedType.LPTStr)] public string pDocName;
          [MarshalAs(UnmanagedType.LPTStr)] public string pOutputFile;
          [MarshalAs(UnmanagedType.LPTStr)] public string pDatatype;
      }

      public async Task<object> Invoke(dynamic input) {
          string printerName = (string)input.printerName;
          byte[] rawData = (byte[])input.data;
          string jobName = (string)input.jobName != null ? (string)input.jobName : "Node Print Job";

          if (string.IsNullOrEmpty(printerName)) {
              throw new Exception("Printer name is required");
          }
          if (rawData == null || rawData.Length == 0) {
              throw new Exception("Print data is required");
          }

          IntPtr hPrinter = IntPtr.Zero;
          try {
              if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
                  int errorCode = Marshal.GetLastWin32Error();
                  throw new Exception("Failed to open printer: " + printerName + " (Error Code: " + errorCode + ")");
              }

              DOC_INFO_1 docInfo = new DOC_INFO_1 {
                  pDocName = jobName,
                  pOutputFile = null,
                  pDatatype = null
              };

              int jobId = StartDocPrinter(hPrinter, 1, ref docInfo);
              if (jobId == 0) {
                  int errorCode = Marshal.GetLastWin32Error();
                  throw new Exception("Failed to start document for printer: " + printerName + " (Error Code: " + errorCode + ")");
              }

              if (!StartPagePrinter(hPrinter)) {
                  int errorCode = Marshal.GetLastWin32Error();
                  throw new Exception("Failed to start page (Error Code: " + errorCode + ")");
              }

              IntPtr unmanagedPointer = Marshal.AllocHGlobal(rawData.Length);
              try {
                  Marshal.Copy(rawData, 0, unmanagedPointer, rawData.Length);
                  int bytesWritten;
                  if (!WritePrinter(hPrinter, unmanagedPointer, rawData.Length, out bytesWritten)) {
                      int errorCode = Marshal.GetLastWin32Error();
                      throw new Exception("Failed to write to printer (Error Code: " + errorCode + ")");
                  }

                  if (!EndPagePrinter(hPrinter)) {
                      int errorCode = Marshal.GetLastWin32Error();
                      throw new Exception("Failed to end page (Error Code: " + errorCode + ")");
                  }

                  if (!EndDocPrinter(hPrinter)) {
                      int errorCode = Marshal.GetLastWin32Error();
                      throw new Exception("Failed to end document (Error Code: " + errorCode + ")");
                  }

                  return new { jobId = jobId, bytesWritten = bytesWritten, success = true };
              }
              finally {
                  Marshal.FreeHGlobal(unmanagedPointer);
              }
          }
          finally {
              if (hPrinter != IntPtr.Zero) {
                  ClosePrinter(hPrinter);
              }
          }
      }
  }
`)

const checkPrinterStatus = edge.func(`
  using System;
  using System.Runtime.InteropServices;
  using System.Threading.Tasks;

  public class Startup {
      [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Auto)]
      public static extern bool OpenPrinter(string pPrinterName, out IntPtr phPrinter, IntPtr pDefault);

      [DllImport("winspool.drv", SetLastError = true)]
      public static extern bool ClosePrinter(IntPtr hPrinter);

      [DllImport("winspool.drv", SetLastError = true, CharSet = CharSet.Auto)]
      public static extern bool GetPrinter(IntPtr hPrinter, int Level, IntPtr pPrinter, int cbBuf, out int pcbNeeded);

      [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Auto)]
      public struct PRINTER_INFO_2 {
          public string pServerName;
          public string pPrinterName;
          public string pShareName;
          public string pPortName;
          public string pDriverName;
          public string pComment;
          public string pLocation;
          public IntPtr pDevMode;
          public string pSepFile;
          public string pPrintProcessor;
          public string pDatatype;
          public string pParameters;
          public IntPtr pSecurityDescriptor;
          public uint Attributes;
          public uint Priority;
          public uint DefaultPriority;
          public uint StartTime;
          public uint UntilTime;
          public uint Status;
          public uint cJobs;
          public uint AveragePPM;
      }

      public async Task<object> Invoke(object input) {
          return await Task.Run(() => {
              try {
                  dynamic inputObj = input;
                  string printerName = inputObj.printerName;
                  
                  if (string.IsNullOrEmpty(printerName)) {
                      return new { online = false, error = "Invalid printer name" };
                  }

                  IntPtr hPrinter;
                  if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero)) {
                      return new { online = false, error = "Printer not found" };
                  }

                  try {
                      int needed;
                      GetPrinter(hPrinter, 2, IntPtr.Zero, 0, out needed);
                      IntPtr buffer = Marshal.AllocHGlobal(needed);

                      try {
                          int dummy;
                          if (!GetPrinter(hPrinter, 2, buffer, needed, out dummy)) {
                              return new { online = false, error = "Failed to get printer info" };
                          }

                          PRINTER_INFO_2 info = (PRINTER_INFO_2)Marshal.PtrToStructure(buffer, typeof(PRINTER_INFO_2));
                          
                          // Check if printer is offline (bit 7 = 0x80)
                          if ((info.Status & 0x80) != 0) {
                              return new { online = false, error = "Printer is offline" };
                          }
                          
                          // Check for other critical errors
                          if ((info.Status & 0x02) != 0) { // Error
                              return new { online = false, error = "Printer error" };
                          }
                          
                          if ((info.Status & 0x08) != 0) { // Paper jam
                              return new { online = false, error = "Paper jam" };
                          }
                          
                          if ((info.Status & 0x10) != 0) { // Paper out
                              return new { online = false, error = "Paper out" };
                          }
                          
                          // Check work offline attribute (bit 10 = 0x400)
                          if ((info.Attributes & 0x400) != 0) {
                              return new { online = false, error = "Set to work offline" };
                          }

                          return new { online = true, error = "" };
                      }
                      finally {
                          Marshal.FreeHGlobal(buffer);
                      }
                  }
                  finally {
                      ClosePrinter(hPrinter);
                  }
              }
              catch (Exception ex) {
                  return new { online = false, error = ex.Message };
              }
          });
      }
  }
`)

export { printRaw, checkPrinterStatus }
